import { z } from 'zod';

// Ghana phone number validation
export const ghanaPhoneSchema = z.string();
// .regex(/^(\+233|0)(20|23|24|26|27|28|29|50|54|55|56|57|59)\d{7}$/,
//   'Invalid Ghana phone number format');

// International phone number validation (for non-Ghana numbers)
export const internationalPhoneSchema = z
  .string()
  .regex(
    /^\+[1-9]\d{1,14}$/,
    'Invalid international phone number format'
  );

// General phone number validation (Ghana or international)
export const phoneSchema = z.string().refine((phone) => {
  // Check if it's a Ghana number
  const ghanaRegex =
    /^(\+233|0)(20|23|24|26|27|28|29|50|54|55|56|57|59)\d{7}$/;
  // Check if it's an international number
  const intlRegex = /^\+[1-9]\d{1,14}$/;
  return ghanaRegex.test(phone) || intlRegex.test(phone);
}, 'Invalid phone number format');

// Voter validation schemas
export const createVoterSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: ghanaPhoneSchema,
  classYearGroup: z.string().optional(),
  uniqueIdentifier: z.string().optional(),
});

export const importVotersSchema = z.array(
  z.object({
    full_name: z.string().min(2).max(100),
    phone: ghanaPhoneSchema,
    class_year_group: z.string().optional(),
    unique_id: z.string().optional(),
  })
);

// Election validation schemas
export const createElectionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allowAbstain: z.boolean().default(true),
});

// Position validation schemas
export const createPositionSchema = z.object({
  name: z.string().min(2).max(100),
  order: z.number().int().positive(),
});

// Candidate validation schemas
export const createCandidateSchema = z.object({
  fullName: z.string().min(2).max(100),
  classYearGroup: z.string().optional(),
  bio: z.string().max(500).optional(),
  order: z.number().int().min(0).default(0),
});

// OTP validation schemas
export const requestOtpSchema = z.object({
  phone: ghanaPhoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: ghanaPhoneSchema,
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

// Voting validation schemas
export const castVoteSchema = z.object({
  positionId: z.string().cuid(),
  candidateId: z.string().cuid().optional(), // null for abstain
});

// Dispute validation schemas
export const createDisputeSchema = z.object({
  electionId: z.string().cuid(),
  positionId: z.string().cuid().optional(),
  candidateId: z.string().cuid().optional(),
  description: z.string().min(10).max(1000),
});

// User validation schemas
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(8),
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  password: z.string().min(8),
  role: z
    .enum(['ADMIN', 'EC_MEMBER', 'ADVISORY_COUNCIL'])
    .default('ADMIN'),
});

// Site manager schema for registering admins
export const createAdminSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  password: z.string().min(8),
  role: z
    .enum(['ADMIN', 'EC_MEMBER', 'ADVISORY_COUNCIL'])
    .default('ADMIN'),
});
