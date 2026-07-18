import { ApiError, isUuid } from './core';
import type { SupermarketContext } from './supermarketRepository';
import { createAdminServerClient, isServerSupabaseAdminConfigured } from '@/lib/server/supabase';

export type LoyaltyTier = 'bronze' | 'silver' | 'gold';
export type LoyaltyBenefitType = 'points_multiplier' | 'fixed_points' | 'percent_discount';

export interface LoyaltyCustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  documentNumber: string;
  birthDate: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  marketingConsent: boolean;
  active: boolean;
  lastMovementAt: string | null;
}

export interface LoyaltyCustomerInput {
  id?: string;
  name: string;
  phone: string;
  email: string;
  documentNumber: string;
  birthDate: string;
  marketingConsent: boolean;
  active: boolean;
}

export interface LoyaltyCampaignRecord {
  id: string;
  name: string;
  benefitType: LoyaltyBenefitType;
  benefitValue: number;
  minimumPurchase: number;
  startsOn: string;
  endsOn: string;
  active: boolean;
  isCurrent: boolean;
}

export type LoyaltyCampaignInput = Omit<LoyaltyCampaignRecord, 'id' | 'isCurrent'> & { id?: string };

export interface LoyaltyRewardRecord {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  stockLimit: number | null;
  redeemedCount: number;
  availableCount: number | null;
  imageUrl: string | null;
  active: boolean;
}

export interface LoyaltyRewardInput {
  id?: string;
  name: string;
  description: string;
  pointsCost: number;
  stockLimit: number | null;
  imageUrl: string | null;
  active: boolean;
}

export interface LoyaltyMovementRecord {
  id: string;
  customerId: string;
  customerName: string;
  movementType: 'earn' | 'redeem' | 'adjust';
  pointsDelta: number;
  balanceAfter: number;
  purchaseAmount: number | null;
  campaignName: string;
  rewardName: string;
  reference: string;
  createdAt: string;
}

interface LocalLoyaltyState {
  customers: Map<string, LoyaltyCustomerRecord[]>;
  campaigns: Map<string, LoyaltyCampaignRecord[]>;
  rewards: Map<string, LoyaltyRewardRecord[]>;
  movements: Map<string, LoyaltyMovementRecord[]>;
  results: Map<string, { movementId: string; points: number; balance: number; duplicate: boolean }>;
}

const globalWithLoyalty = globalThis as typeof globalThis & { __programaSassSupermarketLoyalty?: LocalLoyaltyState };
const localState: LocalLoyaltyState = globalWithLoyalty.__programaSassSupermarketLoyalty ?? {
  customers: new Map(), campaigns: new Map(), rewards: new Map(), movements: new Map(), results: new Map(),
};
globalWithLoyalty.__programaSassSupermarketLoyalty = localState;

function branchKey(context: SupermarketContext): string {
  return `${context.companyId}:${context.branchId ?? 'main'}`;
}

function companyKey(context: SupermarketContext): string {
  return context.companyId;
}

function branchId(context: SupermarketContext): string {
  if (!context.branchId) throw new ApiError(409, 'Debe seleccionar una sucursal.', 'BRANCH_REQUIRED');
  return context.branchId;
}

function persistenceUnavailable(): never {
  throw new ApiError(503, 'La persistencia de fidelizacion no esta configurada.', 'PERSISTENCE_NOT_CONFIGURED');
}

function tierFor(points: number): LoyaltyTier {
  if (points >= 1500) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
}

function localCustomers(context: SupermarketContext): LoyaltyCustomerRecord[] {
  const stateKey = companyKey(context);
  const current = localState.customers.get(stateKey);
  if (current) return current;
  const seeded: LoyaltyCustomerRecord[] = [
    { id: 'loyal-1', name: 'Ana Torres', phone: '11 4455 2211', email: 'ana@example.com', documentNumber: '28111222', birthDate: '1985-09-12', pointsBalance: 1680, lifetimePoints: 2380, tier: 'gold', marketingConsent: true, active: true, lastMovementAt: null },
    { id: 'loyal-2', name: 'Carlos Diaz', phone: '11 6677 4411', email: 'carlos@example.com', documentNumber: '32333444', birthDate: '1990-02-21', pointsBalance: 720, lifetimePoints: 920, tier: 'silver', marketingConsent: true, active: true, lastMovementAt: null },
    { id: 'loyal-3', name: 'Marta Ruiz', phone: '11 2233 8899', email: '', documentNumber: '', birthDate: '', pointsBalance: 180, lifetimePoints: 180, tier: 'bronze', marketingConsent: false, active: true, lastMovementAt: null },
  ];
  localState.customers.set(stateKey, seeded);
  return seeded;
}

function localCampaigns(context: SupermarketContext): LoyaltyCampaignRecord[] {
  const stateKey = companyKey(context);
  const current = localState.campaigns.get(stateKey);
  if (current) return current;
  const seeded: LoyaltyCampaignRecord[] = [
    { id: 'campaign-1', name: 'Doble puntos fin de semana', benefitType: 'points_multiplier', benefitValue: 2, minimumPurchase: 10000, startsOn: '2026-07-01', endsOn: '2026-08-31', active: true, isCurrent: true },
    { id: 'campaign-2', name: 'Bono primera compra', benefitType: 'fixed_points', benefitValue: 100, minimumPurchase: 5000, startsOn: '2026-07-01', endsOn: '2026-12-31', active: true, isCurrent: true },
  ];
  localState.campaigns.set(stateKey, seeded);
  return seeded;
}

function localRewards(context: SupermarketContext): LoyaltyRewardRecord[] {
  const stateKey = companyKey(context);
  const current = localState.rewards.get(stateKey);
  if (current) return current;
  const seeded: LoyaltyRewardRecord[] = [
    { id: 'reward-1', name: 'Descuento $3.000', description: 'Cupon para la proxima compra.', pointsCost: 500, stockLimit: null, redeemedCount: 12, availableCount: null, imageUrl: null, active: true },
    { id: 'reward-2', name: 'Bolsa reutilizable', description: 'Bolsa reforzada con marca del comercio.', pointsCost: 250, stockLimit: 100, redeemedCount: 38, availableCount: 62, imageUrl: null, active: true },
  ];
  localState.rewards.set(stateKey, seeded);
  return seeded;
}

export async function listLoyaltyCustomers(context: SupermarketContext): Promise<LoyaltyCustomerRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_loyalty_customers', { p_company_id: context.companyId });
    if (error) throw new ApiError(503, 'No se pudieron consultar los socios.', 'LOYALTY_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), name: String(item.name), phone: String(item.phone ?? ''), email: String(item.email ?? ''),
      documentNumber: String(item.document_number ?? ''), birthDate: String(item.birth_date ?? ''),
      pointsBalance: Number(item.points_balance), lifetimePoints: Number(item.lifetime_points), tier: item.tier as LoyaltyTier,
      marketingConsent: item.marketing_consent === true, active: item.active === true,
      lastMovementAt: item.last_movement_at ? String(item.last_movement_at) : null,
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localCustomers(context).map((item) => ({ ...item }));
}

export async function saveLoyaltyCustomer(context: SupermarketContext, input: LoyaltyCustomerInput): Promise<LoyaltyCustomerRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'El socio no es valido.', 'INVALID_CUSTOMER_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_save_loyalty_customer', {
      p_company_id: context.companyId, p_user_id: context.userId, p_customer_id: input.id ?? null,
      p_name: input.name, p_phone: input.phone, p_email: input.email,
      p_document_number: input.documentNumber, p_birth_date: input.birthDate || null,
      p_marketing_consent: input.marketingConsent, p_active: input.active,
    });
    if (error?.message.includes('LOYALTY_PHONE_EXISTS')) throw new ApiError(409, 'Ya existe un socio con ese telefono.', 'LOYALTY_PHONE_EXISTS');
    if (error?.message.includes('LOYALTY_CUSTOMER_NOT_FOUND')) throw new ApiError(404, 'El socio no existe.', 'LOYALTY_CUSTOMER_NOT_FOUND');
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar el socio.', 'LOYALTY_UNAVAILABLE');
    const saved = (await listLoyaltyCustomers(context)).find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'El socio no pudo recuperarse.', 'LOYALTY_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const customers = localCustomers(context);
  const normalized = input.phone.replace(/[^0-9+]/g, '');
  if (customers.some((item) => item.phone.replace(/[^0-9+]/g, '') === normalized && item.id !== input.id)) throw new ApiError(409, 'Ya existe un socio con ese telefono.', 'LOYALTY_PHONE_EXISTS');
  const previous = input.id ? customers.find((item) => item.id === input.id) : undefined;
  if (input.id && !previous) throw new ApiError(404, 'El socio no existe.', 'LOYALTY_CUSTOMER_NOT_FOUND');
  const saved: LoyaltyCustomerRecord = {
    ...input, id: previous?.id ?? `loyal-${crypto.randomUUID()}`,
    pointsBalance: previous?.pointsBalance ?? 0, lifetimePoints: previous?.lifetimePoints ?? 0,
    tier: previous?.tier ?? 'bronze', lastMovementAt: previous?.lastMovementAt ?? null,
  };
  localState.customers.set(companyKey(context), previous ? customers.map((item) => item.id === saved.id ? saved : item) : [saved, ...customers]);
  return { ...saved };
}

export async function listLoyaltyCampaigns(context: SupermarketContext): Promise<LoyaltyCampaignRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_loyalty_campaigns', { p_company_id: context.companyId });
    if (error) throw new ApiError(503, 'No se pudieron consultar las campanas.', 'LOYALTY_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), name: String(item.name), benefitType: item.benefit_type as LoyaltyBenefitType,
      benefitValue: Number(item.benefit_value), minimumPurchase: Number(item.minimum_purchase),
      startsOn: String(item.starts_on), endsOn: String(item.ends_on), active: item.active === true, isCurrent: item.is_current === true,
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const today = new Date().toISOString().slice(0, 10);
  return localCampaigns(context).map((item) => ({ ...item, isCurrent: item.active && today >= item.startsOn && today <= item.endsOn }));
}

export async function saveLoyaltyCampaign(context: SupermarketContext, input: LoyaltyCampaignInput): Promise<LoyaltyCampaignRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'La campana no es valida.', 'INVALID_CAMPAIGN_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_save_loyalty_campaign', {
      p_company_id: context.companyId, p_user_id: context.userId, p_campaign_id: input.id ?? null,
      p_name: input.name, p_benefit_type: input.benefitType, p_benefit_value: input.benefitValue,
      p_minimum_purchase: input.minimumPurchase, p_starts_on: input.startsOn,
      p_ends_on: input.endsOn, p_active: input.active,
    });
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar la campana.', 'LOYALTY_UNAVAILABLE');
    const saved = (await listLoyaltyCampaigns(context)).find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'La campana no pudo recuperarse.', 'LOYALTY_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const campaigns = localCampaigns(context);
  const previous = input.id ? campaigns.find((item) => item.id === input.id) : undefined;
  const today = new Date().toISOString().slice(0, 10);
  const saved: LoyaltyCampaignRecord = { ...input, id: previous?.id ?? `campaign-${crypto.randomUUID()}`, isCurrent: input.active && today >= input.startsOn && today <= input.endsOn };
  localState.campaigns.set(companyKey(context), previous ? campaigns.map((item) => item.id === saved.id ? saved : item) : [saved, ...campaigns]);
  return { ...saved };
}

export async function listLoyaltyRewards(context: SupermarketContext): Promise<LoyaltyRewardRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_loyalty_rewards', { p_company_id: context.companyId });
    if (error) throw new ApiError(503, 'No se pudieron consultar los premios.', 'LOYALTY_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), name: String(item.name), description: String(item.description ?? ''),
      pointsCost: Number(item.points_cost), stockLimit: item.stock_limit === null ? null : Number(item.stock_limit),
      redeemedCount: Number(item.redeemed_count), availableCount: item.available_count === null ? null : Number(item.available_count),
      imageUrl: item.image_url ? String(item.image_url) : null, active: item.active === true,
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localRewards(context).map((item) => ({ ...item }));
}

export async function saveLoyaltyReward(context: SupermarketContext, input: LoyaltyRewardInput): Promise<LoyaltyRewardRecord> {
  if (isServerSupabaseAdminConfigured) {
    if (input.id && !isUuid(input.id)) throw new ApiError(400, 'El premio no es valido.', 'INVALID_REWARD_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_save_loyalty_reward', {
      p_company_id: context.companyId, p_user_id: context.userId, p_reward_id: input.id ?? null,
      p_name: input.name, p_description: input.description, p_points_cost: input.pointsCost,
      p_stock_limit: input.stockLimit, p_image_url: input.imageUrl, p_active: input.active,
    });
    if (error?.message.includes('INVALID_STOCK')) throw new ApiError(409, 'El stock limite no puede ser menor a los canjes realizados.', 'INVALID_REWARD_STOCK');
    if (error || typeof data !== 'string') throw new ApiError(503, 'No se pudo guardar el premio.', 'LOYALTY_UNAVAILABLE');
    const saved = (await listLoyaltyRewards(context)).find((item) => item.id === data);
    if (!saved) throw new ApiError(503, 'El premio no pudo recuperarse.', 'LOYALTY_UNAVAILABLE');
    return saved;
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const rewards = localRewards(context);
  const previous = input.id ? rewards.find((item) => item.id === input.id) : undefined;
  const redeemedCount = previous?.redeemedCount ?? 0;
  const saved: LoyaltyRewardRecord = { ...input, id: previous?.id ?? `reward-${crypto.randomUUID()}`, redeemedCount, availableCount: input.stockLimit === null ? null : input.stockLimit - redeemedCount };
  localState.rewards.set(companyKey(context), previous ? rewards.map((item) => item.id === saved.id ? saved : item) : [saved, ...rewards]);
  return { ...saved };
}

export async function listLoyaltyMovements(context: SupermarketContext, customerId?: string): Promise<LoyaltyMovementRecord[]> {
  if (isServerSupabaseAdminConfigured) {
    if (customerId && !isUuid(customerId)) throw new ApiError(400, 'El socio no es valido.', 'INVALID_CUSTOMER_ID');
    const { data, error } = await createAdminServerClient().rpc('supermarket_list_loyalty_movements', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_customer_id: customerId ?? null,
    });
    if (error) throw new ApiError(503, 'No se pudieron consultar los movimientos.', 'LOYALTY_UNAVAILABLE');
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id), customerId: String(item.customer_id), customerName: String(item.customer_name),
      movementType: item.movement_type as LoyaltyMovementRecord['movementType'], pointsDelta: Number(item.points_delta),
      balanceAfter: Number(item.balance_after), purchaseAmount: item.purchase_amount === null ? null : Number(item.purchase_amount),
      campaignName: String(item.campaign_name ?? ''), rewardName: String(item.reward_name ?? ''),
      reference: String(item.reference), createdAt: String(item.created_at),
    }));
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return (localState.movements.get(branchKey(context)) ?? []).filter((item) => !customerId || item.customerId === customerId).map((item) => ({ ...item }));
}

async function localPointMovement(
  context: SupermarketContext,
  input: { idempotencyKey: string; customerId: string; movementType: LoyaltyMovementRecord['movementType']; pointsDelta: number; reference: string; purchaseAmount?: number | null; campaignName?: string; rewardName?: string },
) {
  const resultKey = `${context.companyId}:${input.idempotencyKey}`;
  const previousResult = localState.results.get(resultKey);
  if (previousResult) return { ...previousResult, duplicate: true };
  const customers = localCustomers(context);
  const customer = customers.find((item) => item.id === input.customerId && item.active);
  if (!customer) throw new ApiError(404, 'El socio no existe o esta inactivo.', 'LOYALTY_CUSTOMER_NOT_FOUND');
  const balance = customer.pointsBalance + input.pointsDelta;
  if (balance < 0) throw new ApiError(409, 'El socio no tiene puntos suficientes.', 'INSUFFICIENT_LOYALTY_POINTS');
  const lifetime = customer.lifetimePoints + (input.movementType === 'earn' ? input.pointsDelta : 0);
  const createdAt = new Date().toISOString();
  const movement: LoyaltyMovementRecord = {
    id: `loyalty-movement-${crypto.randomUUID()}`, customerId: customer.id, customerName: customer.name,
    movementType: input.movementType, pointsDelta: input.pointsDelta, balanceAfter: balance,
    purchaseAmount: input.purchaseAmount ?? null, campaignName: input.campaignName ?? '',
    rewardName: input.rewardName ?? '', reference: input.reference, createdAt,
  };
  localState.customers.set(companyKey(context), customers.map((item) => item.id === customer.id ? { ...item, pointsBalance: balance, lifetimePoints: lifetime, tier: tierFor(lifetime), lastMovementAt: createdAt } : item));
  localState.movements.set(branchKey(context), [movement, ...(localState.movements.get(branchKey(context)) ?? [])]);
  const result = { movementId: movement.id, points: Math.abs(input.pointsDelta), balance, duplicate: false };
  localState.results.set(resultKey, result);
  return result;
}

export async function creditLoyaltyPurchase(context: SupermarketContext, input: { idempotencyKey: string; customerId: string; purchaseAmount: number; saleId?: string; campaignId?: string }) {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.customerId) || (input.saleId && !isUuid(input.saleId)) || (input.campaignId && !isUuid(input.campaignId))) throw new ApiError(400, 'La acreditacion no es valida.', 'INVALID_LOYALTY_PURCHASE');
    const { data, error } = await createAdminServerClient().rpc('supermarket_credit_loyalty_purchase', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_customer_id: input.customerId,
      p_purchase_amount: input.purchaseAmount, p_sale_id: input.saleId ?? null, p_campaign_id: input.campaignId ?? null,
    });
    if (error?.message.includes('CAMPAIGN_NOT_APPLICABLE')) throw new ApiError(409, 'La campana no esta vigente o no alcanza la compra minima.', 'LOYALTY_CAMPAIGN_NOT_APPLICABLE');
    if (error?.message.includes('CUSTOMER_NOT_FOUND')) throw new ApiError(404, 'El socio no existe o esta inactivo.', 'LOYALTY_CUSTOMER_NOT_FOUND');
    if (error) throw new ApiError(503, 'No se pudieron acreditar los puntos.', 'LOYALTY_UNAVAILABLE');
    return data as { movementId: string; points: number; balance: number; tier: LoyaltyTier; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const campaign = input.campaignId ? localCampaigns(context).find((item) => item.id === input.campaignId && item.isCurrent && input.purchaseAmount >= item.minimumPurchase) : undefined;
  if (input.campaignId && !campaign) throw new ApiError(409, 'La campana no esta vigente o no alcanza la compra minima.', 'LOYALTY_CAMPAIGN_NOT_APPLICABLE');
  const base = Math.max(1, Math.floor(input.purchaseAmount / 100));
  const points = campaign?.benefitType === 'points_multiplier' ? Math.floor(base * campaign.benefitValue) : campaign?.benefitType === 'fixed_points' ? base + Math.floor(campaign.benefitValue) : base;
  return localPointMovement(context, { idempotencyKey: input.idempotencyKey, customerId: input.customerId, movementType: 'earn', pointsDelta: points, purchaseAmount: input.purchaseAmount, campaignName: campaign?.name, reference: `Puntos por compra de $${input.purchaseAmount.toFixed(2)}` });
}

export async function redeemLoyaltyReward(context: SupermarketContext, input: { idempotencyKey: string; customerId: string; rewardId: string }) {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.customerId) || !isUuid(input.rewardId)) throw new ApiError(400, 'El canje no es valido.', 'INVALID_LOYALTY_REDEMPTION');
    const { data, error } = await createAdminServerClient().rpc('supermarket_redeem_loyalty_reward', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_customer_id: input.customerId, p_reward_id: input.rewardId,
    });
    if (error?.message.includes('INSUFFICIENT_LOYALTY_POINTS')) throw new ApiError(409, 'El socio no tiene puntos suficientes.', 'INSUFFICIENT_LOYALTY_POINTS');
    if (error?.message.includes('OUT_OF_STOCK')) throw new ApiError(409, 'El premio no tiene stock disponible.', 'LOYALTY_REWARD_OUT_OF_STOCK');
    if (error) throw new ApiError(503, 'No se pudo completar el canje.', 'LOYALTY_UNAVAILABLE');
    return data as { movementId: string; points: number; balance: number; rewardName: string; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  const rewards = localRewards(context);
  const reward = rewards.find((item) => item.id === input.rewardId && item.active);
  if (!reward) throw new ApiError(404, 'El premio no existe.', 'LOYALTY_REWARD_NOT_FOUND');
  if (reward.availableCount !== null && reward.availableCount <= 0) throw new ApiError(409, 'El premio no tiene stock disponible.', 'LOYALTY_REWARD_OUT_OF_STOCK');
  const result = await localPointMovement(context, { idempotencyKey: input.idempotencyKey, customerId: input.customerId, movementType: 'redeem', pointsDelta: -reward.pointsCost, rewardName: reward.name, reference: `Canje: ${reward.name}` });
  localState.rewards.set(companyKey(context), rewards.map((item) => item.id === reward.id ? { ...item, redeemedCount: item.redeemedCount + 1, availableCount: item.availableCount === null ? null : item.availableCount - 1 } : item));
  return { ...result, rewardName: reward.name };
}

export async function adjustLoyaltyPoints(context: SupermarketContext, input: { idempotencyKey: string; customerId: string; pointsDelta: number; reference: string }) {
  if (isServerSupabaseAdminConfigured) {
    if (!isUuid(input.customerId)) throw new ApiError(400, 'El ajuste no es valido.', 'INVALID_LOYALTY_ADJUSTMENT');
    const { data, error } = await createAdminServerClient().rpc('supermarket_adjust_loyalty_points', {
      p_company_id: context.companyId, p_branch_id: branchId(context), p_user_id: context.userId,
      p_idempotency_key: input.idempotencyKey, p_customer_id: input.customerId,
      p_points_delta: input.pointsDelta, p_reference: input.reference,
    });
    if (error?.message.includes('INSUFFICIENT_LOYALTY_POINTS')) throw new ApiError(409, 'El ajuste dejaria un saldo negativo.', 'INSUFFICIENT_LOYALTY_POINTS');
    if (error) throw new ApiError(503, 'No se pudo ajustar el saldo.', 'LOYALTY_UNAVAILABLE');
    return data as { movementId: string; points: number; balance: number; duplicate: boolean };
  }
  if (process.env.NODE_ENV === 'production') persistenceUnavailable();
  return localPointMovement(context, { ...input, movementType: 'adjust' });
}
