import { z } from "zod";

const optionalLat = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}, z.number().min(-90).max(90).optional());

const optionalLng = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}, z.number().min(-180).max(180).optional());

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Kullanici adi sadece harf, rakam ve _ icerebilir."),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.toLowerCase() : ""))
    .refine((value) => !value || /^[^\s@]+@gmail\.com$/i.test(value), "Geçerli bir Gmail adresi girin."),
  password: z.string().min(6).max(64),
  birthDate: z.coerce.date(),
  showAge: z.coerce.boolean().optional().default(false),
  accountType: z.enum(["NEIGHBOR", "BUSINESS"]),
  businessCategory: z.string().max(80).optional(),
  profileImage: z.string().max(300).optional(),
  shopLogo: z.string().max(300).optional(),
  businessClosedHours: z
    .array(
      z
        .object({
          day: z.number().int().min(0).max(6),
          mode: z.enum(["FULL_DAY", "RANGE"]),
          start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          end: z.string().regex(/^\d{2}:\d{2}$/).optional()
        })
        .superRefine((value, ctx) => {
          if (value.mode === "RANGE" && (!value.start || !value.end)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Saat araligi icin baslangic ve bitis zorunlu."
            });
          }
        })
    )
    .optional()
}).superRefine((data, ctx) => {
  if (data.accountType === "BUSINESS" && (!data.businessCategory || data.businessCategory.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["businessCategory"],
      message: "Isletme kategorisi secmelisiniz."
    });
  }
  if (data.accountType === "BUSINESS" && data.businessClosedHours) {
    const duplicateDay = data.businessClosedHours.findIndex(
      (item, index) => data.businessClosedHours!.findIndex((x) => x.day === item.day) !== index
    );
    if (duplicateDay >= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessClosedHours"],
        message: "Ayni gun icin birden fazla kapali kaydi girilemez."
      });
    }
  }
});

export const verifyNeighborhoodSchema = z.object({
  neighborhoodId: z.string().min(1),
  inviteCode: z.string().min(3)
});

export const listingCreateSchema = z.object({
  type: z.enum(["PRODUCT", "SERVICE", "JOB"]),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(3000),
  price: z.number().nullable().optional(),
  category: z.string().min(2).max(80),
  photos: z.array(z.string()).max(8),
  locationHint: z.string().max(120).optional(),
  locationText: z.string().max(180).optional(),
  locationLat: optionalLat,
  locationLng: optionalLng
});

export const conversationCreateSchema = z
  .object({
    listingId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    contextTitle: z.string().max(180).optional()
  })
  .refine((data) => Boolean(data.listingId || data.userId), {
    message: "listingId veya userId gerekli"
  });

export const groupConversationCreateSchema = z.object({
  groupName: z.string().min(3).max(80),
  groupDescription: z.string().max(240).optional(),
  participantIds: z.array(z.string().min(1)).min(1).max(24),
  groupImage: z.string().max(300).optional()
});

export const messageCreateSchema = z.object({
  body: z.string().min(1).max(1000)
});

export const reportCreateSchema = z.object({
  targetType: z.enum(["USER", "LISTING", "MESSAGE", "BOARD"]),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(120),
  details: z.string().max(1000).optional()
});

export const boardPostCreateSchema = z.object({
  type: z.enum(["LOST_FOUND", "INFRASTRUCTURE", "NOISE", "EVENT", "ANNOUNCEMENT"]),
  title: z.string().min(3).max(120),
  body: z.string().min(5).max(1000),
  photos: z.array(z.string().max(300)).max(6).optional(),
  locationText: z.string().max(180).optional(),
  locationLat: optionalLat,
  locationLng: optionalLng
});

export const flowPostCreateSchema = z.object({
  body: z.string().min(2).max(560),
  photos: z.array(z.string().max(300)).max(4).optional(),
  parentPostId: z.string().min(1).optional(),
  repostOfPostId: z.string().min(1).optional()
});

export const pollCreateSchema = z.object({
  question: z.string().min(5).max(180),
  options: z.array(z.string().min(1).max(80)).min(2).max(5)
});

export const pollVoteSchema = z.object({
  optionIndex: z.coerce.number().int().min(0)
});

export const pollAddOptionSchema = z.object({
  option: z.string().min(1).max(80)
});

export const userRatingSchema = z.object({
  score: z.coerce.number().min(0).max(10).refine((value) => Math.round(value * 2) === value * 2, {
    message: "Puan 0.5 adimlarla girilmelidir."
  })
});
