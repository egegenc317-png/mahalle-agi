import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const packageName = process.env.TWA_PACKAGE_NAME || "com.dijitalmahallem.app";
  const rawFingerprints = (process.env.TWA_SHA256_CERT_FINGERPRINTS || "").split(",").map((item) => item.trim()).filter(Boolean);

  const fingerprints = rawFingerprints.length
    ? rawFingerprints
    : ["ADD_YOUR_PLAY_SIGNING_SHA256_FINGERPRINT_HERE"];

  return NextResponse.json(
    fingerprints.map((fingerprint) => ({
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: [fingerprint]
      }
    }))
  );
}
