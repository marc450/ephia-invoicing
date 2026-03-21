/**
 * migration.js
 * Auto-migrates data from the legacy `invoices` table to the new
 * `documents` + `behandlungen` tables. Idempotent and safe to interrupt.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase/client";
import { supabaseFetchInvoices } from "./supabase/invoices";
import { supabaseFetchDocuments, supabaseCreateDocument } from "./supabase/documents";
import { supabaseCreateBehandlung } from "./supabase/behandlungen";
import { supabaseFetchProfiles } from "./supabase/profiles";
import { encryptData, decryptData } from "./crypto";

const headers = (accessToken) => ({
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${accessToken}`,
});

/**
 * Determine doc_type from legacy invoice boolean flags
 */
function getDocType(inv) {
  if (inv._consentForm) return "aufklaerung";
  if (inv._hvOnly) return "hv";
  if ((inv._standalone || inv._treatmentDocOnly) && inv.treatmentDoc) return "behandlungsdoku";
  return "rechnung";
}

/**
 * Main migration entry point.
 * Call after migrateToEncrypted() and before loadUserData().
 */
export async function migrateInvoicesToDocuments(accessToken, userId, mek) {
  // 1. Check migration flag
  const profiles = await supabaseFetchProfiles(accessToken, userId);
  const profile = profiles.length > 0 ? profiles[0] : null;
  if (!profile) {
    console.warn("[MIGRATION] No profile found, skipping migration");
    return;
  }
  if ((profile.docs_migration_version || 0) >= 1) {
    console.log("[MIGRATION] Already migrated (version", profile.docs_migration_version, ")");
    return;
  }

  console.log("[MIGRATION] Starting invoices → documents migration...");

  // 2. Fetch all invoices
  const invoiceRecords = await supabaseFetchInvoices(accessToken, userId);
  if (invoiceRecords.length === 0) {
    console.log("[MIGRATION] No invoices to migrate, setting flag");
    await setMigrationVersion(accessToken, userId, 1);
    return;
  }

  // 3. Fetch existing documents (for idempotency check)
  let existingDocs = [];
  try {
    existingDocs = await supabaseFetchDocuments(accessToken, userId);
  } catch (e) {
    // Table might not exist yet or be empty - that's fine
    console.log("[MIGRATION] Could not fetch existing documents:", e.message);
  }
  const migratedInvoiceIds = new Set(
    existingDocs.filter(d => d.legacy_invoice_id).map(d => d.legacy_invoice_id)
  );

  // 4. Decrypt and migrate each invoice
  // Group Behandlungen by patient+date to avoid duplicates
  const behandlungMap = new Map(); // "patientId::datum" → behandlungId
  let migrated = 0;
  let failures = 0;

  for (const rec of invoiceRecords) {
    if (migratedInvoiceIds.has(rec.id)) {
      migrated++; // already migrated
      continue;
    }

    try {
      // Decrypt
      let inv = rec.data;
      if (mek && rec.encryption_version >= 1 && rec.iv && typeof inv === "string") {
        inv = await decryptData(inv, rec.iv, mek);
      }
      // Handle patient-only encryption
      if (mek && inv.encrypted_patient && inv.patient_iv) {
        inv.patient = await decryptData(inv.encrypted_patient, inv.patient_iv, mek);
        delete inv.encrypted_patient;
        delete inv.patient_iv;
      }

      const docType = getDocType(inv);
      const patientId = inv._patientDbId || null;
      const datum = inv.treatmentDoc?.behandlungsDatum || inv.invoiceMeta?.datum || "";

      // Determine if this needs a Behandlung
      let behandlungId = null;

      if (docType === "behandlungsdoku" || (docType === "rechnung" && inv.treatmentDoc && inv.attachTreatmentPdf)) {
        // Treatment-related records get grouped into Behandlungen
        behandlungId = await getOrCreateBehandlung(
          accessToken, userId, mek, behandlungMap,
          patientId, datum, inv.praeparat || inv.treatmentDoc?.praeparat || "",
          inv.einheit || inv.treatmentDoc?.einheit || "", ""
        );
      } else if (patientId && datum) {
        // For other doc types: check if a Behandlung already exists for same patient+date
        const key = `${patientId}::${datum}`;
        if (behandlungMap.has(key)) {
          behandlungId = behandlungMap.get(key);
        }
      }

      // Encrypt and create document
      await createMigratedDocument(accessToken, userId, mek, patientId, behandlungId, docType, inv, rec.id);

      // If rechnung also has treatmentDoc with attachTreatmentPdf, create a separate behandlungsdoku
      if (docType === "rechnung" && inv.treatmentDoc && inv.attachTreatmentPdf) {
        const tdInv = {
          ...inv,
          _standalone: true,
          _treatmentDocOnly: true,
          invoiceMeta: { datum: inv.treatmentDoc.behandlungsDatum || inv.invoiceMeta?.datum, ort: inv.invoiceMeta?.ort || "" },
        };
        await createMigratedDocument(accessToken, userId, mek, patientId, behandlungId, "behandlungsdoku", tdInv, null);
      }

      migrated++;
    } catch (e) {
      console.error("[MIGRATION] Failed to migrate invoice", rec.id, e);
      failures++;
    }
  }

  console.log(`[MIGRATION] Done: ${migrated} migrated, ${failures} failures`);

  // 5. Set migration flag only if no failures
  if (failures === 0) {
    await setMigrationVersion(accessToken, userId, 1);
    console.log("[MIGRATION] Migration version set to 1");
  } else {
    console.warn("[MIGRATION] Migration had failures, NOT setting version flag. Will retry on next login.");
  }
}

async function getOrCreateBehandlung(accessToken, userId, mek, behandlungMap, patientId, datum, praeparat, einheit, notes) {
  const key = `${patientId}::${datum}`;
  if (behandlungMap.has(key)) return behandlungMap.get(key);

  // Patient is required for Behandlung - skip if missing
  if (!patientId) return null;

  const behData = { datum, praeparat, einheit, notes, status: "completed" };
  let serverData = behData, serverIv = null, serverEncVer = null;
  if (mek) {
    const enc = await encryptData(behData, mek);
    serverData = enc.ciphertext;
    serverIv = enc.iv;
    serverEncVer = 2;
  }
  const created = await supabaseCreateBehandlung(accessToken, userId, patientId, serverData, serverIv, serverEncVer);
  behandlungMap.set(key, created.id);
  return created.id;
}

async function createMigratedDocument(accessToken, userId, mek, patientId, behandlungId, docType, inv, legacyInvoiceId) {
  let serverData = inv, serverIv = null, serverEncVer = null;
  if (mek) {
    const enc = await encryptData(inv, mek);
    serverData = enc.ciphertext;
    serverIv = enc.iv;
    serverEncVer = 2;
  }
  return supabaseCreateDocument(accessToken, userId, patientId, behandlungId, docType, serverData, serverIv, serverEncVer, legacyInvoiceId);
}

async function setMigrationVersion(accessToken, userId, version) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...headers(accessToken),
      "Prefer": "return=representation",
    },
    body: JSON.stringify({ docs_migration_version: version }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[MIGRATION] Failed to set migration version:", err);
  }
}
