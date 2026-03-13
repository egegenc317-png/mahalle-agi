"use client";

export type BrowserPermissionState = "granted" | "prompt" | "denied" | "unsupported";

type LocationResult = {
  lat: number;
  lng: number;
  permissionState: BrowserPermissionState;
};

async function getPermissionState(): Promise<BrowserPermissionState> {
  if (!navigator.permissions?.query) return "unsupported";

  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (result.state === "granted" || result.state === "prompt" || result.state === "denied") {
      return result.state;
    }
    return "unsupported";
  } catch {
    return "unsupported";
  }
}

function geolocationAttempt(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function mapLocationError(error: GeolocationPositionError | null, permissionState: BrowserPermissionState) {
  if (error?.code === 1 || permissionState === "denied") {
    return "Konum izni kapalı görünüyor. Tarayıcı veya telefon ayarlarından konum iznini açıp tekrar dene.";
  }

  if (error?.code === 2) {
    return "Konum bulunamadı. GPS veya hassas konumu açıp tekrar dene.";
  }

  if (error?.code === 3) {
    return "Konum alma isteği zaman aşımına uğradı. Açık alanda veya daha güçlü sinyalde tekrar dene.";
  }

  return "Konum alınamadı. Telefonunda konum servisini ve tarayıcı izinlerini kontrol et.";
}

export async function requestPreciseLocation(): Promise<LocationResult> {
  if (!navigator.geolocation) {
    throw new Error("Tarayıcın konum servisini desteklemiyor.");
  }

  const permissionState = await getPermissionState();

  try {
    const precise = await geolocationAttempt({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });

    return {
      lat: precise.coords.latitude,
      lng: precise.coords.longitude,
      permissionState
    };
  } catch (firstError) {
    try {
      const fallback = await geolocationAttempt({
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 0
      });

      return {
        lat: fallback.coords.latitude,
        lng: fallback.coords.longitude,
        permissionState
      };
    } catch (secondError) {
      const error = (secondError || firstError) as GeolocationPositionError | null;
      throw new Error(mapLocationError(error, permissionState));
    }
  }
}
