import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const coreModule = import(pathToFileURL(path.join(__dirname, 'src/lib/api/core.ts')).href);
const publicStoreModule = import(pathToFileURL(path.join(__dirname, 'src/lib/api/publicDataStore.ts')).href);
const permissionRulesModule = import(pathToFileURL(path.join(__dirname, 'src/lib/api/permissionRules.ts')).href);
const imageRulesModule = import(pathToFileURL(path.join(__dirname, 'src/lib/api/imageRules.ts')).href);
const businessTypesModule = import(pathToFileURL(path.join(__dirname, 'src/config/businessTypes.ts')).href);

test('readJsonObject acepta objetos JSON', async () => {
  const { readJsonObject } = await coreModule;
  const body = await readJsonObject(new Request('http://localhost/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Comercio' }),
  }));
  assert.deepEqual(body, { name: 'Comercio' });
});

test('readJsonObject rechaza JSON inválido con código estable', async () => {
  const { readJsonObject } = await coreModule;
  await assert.rejects(
    () => readJsonObject(new Request('http://localhost/test', { method: 'POST', body: '{' })),
    (error) => error.status === 400 && error.code === 'INVALID_JSON',
  );
});

test('requiredString normaliza espacios y rechaza cadenas vacías', async () => {
  const { requiredString } = await coreModule;
  assert.equal(requiredString({ name: '  Producto  ' }, 'name'), 'Producto');
  assert.throws(() => requiredString({ name: '   ' }, 'name'), /obligatorio/);
});

test('requiredNumber valida mínimos sin confundir cero con ausencia', async () => {
  const { requiredNumber } = await coreModule;
  assert.equal(requiredNumber({ stock: 0 }, 'stock', { min: 0 }), 0);
  assert.throws(() => requiredNumber({ stock: -1 }, 'stock', { min: 0 }), /mayor o igual/);
});

test('enumValue aplica fallback y rechaza opciones desconocidas', async () => {
  const { enumValue } = await coreModule;
  const allowed = ['homologacion', 'produccion'];
  assert.equal(enumValue({}, 'environment', allowed, 'homologacion'), 'homologacion');
  assert.throws(() => enumValue({ environment: 'otro' }, 'environment', allowed), /debe ser uno de/);
});

test('parseCsv respeta comas, saltos de línea y comillas escapadas', async () => {
  const { parseCsv } = await coreModule;
  const rows = parseCsv('name,description\r\n"Remera, premium","Talle ""M"""');
  assert.deepEqual(rows, [
    ['name', 'description'],
    ['Remera, premium', 'Talle "M"'],
  ]);
});

test('requiredBoolean no convierte valores ambiguos', async () => {
  const { requiredBoolean } = await coreModule;
  assert.equal(requiredBoolean({ enabled: false }, 'enabled'), false);
  assert.throws(() => requiredBoolean({ enabled: 'false' }, 'enabled'), /verdadero o falso/);
});

test('isUuid valida identificadores multiempresa', async () => {
  const { isUuid } = await coreModule;
  assert.equal(isUuid('00000000-0000-4000-8000-000000000001'), true);
  assert.equal(isUuid('c-test'), false);
  assert.equal(isUuid('m0000000-0000-0000-0000-000000000001'), false);
});

test('la migración multiempresa contiene los 15 rubros configurados', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260710000012_business_type_alignment.sql'),
    'utf8',
  );
  const businessTypes = [
    'gastronomy', 'retail_apparel', 'healthcare', 'supermarket', 'hardware_store',
    'automotive', 'beauty_salon', 'gym', 'electronics', 'professional_services',
    'pet_shop', 'real_estate', 'hotel_hospitality', 'education', 'laundry_dryclean',
  ];
  businessTypes.forEach((code) => assert.match(migration, new RegExp(`'${code}'`)));
});

test('el seed no contiene UUID de módulos inválidos', () => {
  const seed = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/seed.sql'),
    'utf8',
  );
  assert.doesNotMatch(seed, /m0000000-0000-0000-0000-00000000000/);
});

test('los 15 rubros tienen una consola registrada y una ruta estable', () => {
  const registry = fs.readFileSync(path.join(__dirname, 'src/components/workspace/RubroWorkspace.tsx'), 'utf8');
  const route = fs.readFileSync(path.join(__dirname, 'src/app/rubros/[code]/page.tsx'), 'utf8');
  const businessTypes = [
    'gastronomy', 'retail_apparel', 'healthcare', 'supermarket', 'hardware_store',
    'automotive', 'beauty_salon', 'gym', 'electronics', 'professional_services',
    'pet_shop', 'real_estate', 'hotel_hospitality', 'education', 'laundry_dryclean',
  ];
  businessTypes.forEach((code) => assert.match(registry, new RegExp(`\\b${code}:`)));
  assert.match(route, /generateStaticParams/);
  assert.match(route, /isBusinessTypeCode/);
});

test('el registro de rubros es completo, estricto y no contiene rutas cruzadas', async () => {
  const {
    BUSINESS_TYPES,
    BUSINESS_MODULES,
    BUSINESS_NAVIGATION,
    getBusinessModuleCount,
    getBusinessType,
  } = await businessTypesModule;
  const codes = BUSINESS_TYPES.map((businessType) => businessType.code);

  assert.equal(codes.length, 15);
  assert.equal(new Set(codes).size, codes.length);
  assert.deepEqual(Object.keys(BUSINESS_MODULES).sort(), [...codes].sort());
  assert.deepEqual(Object.keys(BUSINESS_NAVIGATION).sort(), [...codes].sort());

  for (const code of codes) {
    assert.equal(getBusinessType(code).code, code);
    assert.equal(getBusinessModuleCount(code), BUSINESS_MODULES[code].length);
    assert.ok(BUSINESS_MODULES[code].length >= 3, `${code} debe ofrecer al menos tres modulos`);
    for (const module of BUSINESS_MODULES[code]) {
      const routeBusinessType = module.path.match(/^\/rubros\/([^/?#]+)/)?.[1];
      assert.ok(!routeBusinessType || routeBusinessType === code, `${code} contiene una ruta hacia ${routeBusinessType}`);
    }
    for (const navigation of BUSINESS_NAVIGATION[code]) {
      const routeBusinessType = navigation.path.match(/^\/rubros\/([^/?#]+)/)?.[1];
      assert.ok(!routeBusinessType || routeBusinessType === code, `${code} contiene navegacion hacia ${routeBusinessType}`);
    }
  }

  assert.throws(() => getBusinessType('unknown_business'), /not registered/);
});

test('indumentaria usa enlaces integrados dentro de su espacio de trabajo', () => {
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  ['/fitting-room', '/returns', '/collections', '/loyalty'].forEach((legacyPath) => {
    assert.doesNotMatch(config, new RegExp(`path: '${legacyPath}'`));
  });
});

test('gastronomia integra carta, insumos y recetas con el salon', () => {
  const registry = fs.readFileSync(path.join(__dirname, 'src/components/workspace/RubroWorkspace.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/GastronomyWorkspaceConsole.tsx'), 'utf8');
  const salon = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/SalonConsole.tsx'), 'utf8');

  assert.match(registry, /gastronomy\/GastronomyWorkspaceConsole/);
  ['#salon', '#menu', '#ingredients', '#recipes'].forEach((hash) => assert.match(config, new RegExp(hash)));
  assert.match(workspace, /onOrderCommitted={commitOrder}/);
  assert.match(workspace, /type="file"/);
  assert.match(salon, /onOrderCommitted\?/);
});

test('gastronomia persiste insumos y recetas con permisos aislados', () => {
  const ingredientsRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/ingredients/route.ts'), 'utf8');
  const recipesRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/recipes/route.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/gastronomyRepository.ts'), 'utf8');

  assert.match(ingredientsRoute, /gastronomy\.inventory\.read/);
  assert.match(ingredientsRoute, /gastronomy\.inventory\.write/);
  assert.match(recipesRoute, /gastronomy\.recipes\.read/);
  assert.match(recipesRoute, /gastronomy\.recipes\.write/);
  assert.match(repository, /gastronomy_list_ingredients/);
  assert.match(repository, /gastronomy_save_recipe/);
  assert.match(repository, /localIngredients\.set\(context\.companyId/);
});

test('las comandas gastronomicas validan y descuentan stock en una transaccion', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000016_gastronomy_operations.sql'),
    'utf8',
  );
  const ordersRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/orders/route.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/GastronomyWorkspaceConsole.tsx'), 'utf8');
  const salon = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/SalonConsole.tsx'), 'utf8');

  assert.match(ordersRoute, /gastronomy\.orders\.write/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.gastronomy_commit_order/);
  assert.match(migration, /FOR UPDATE OF s/);
  assert.match(migration, /INSUFFICIENT_PRODUCT_STOCK/);
  assert.match(migration, /INSUFFICIENT_INGREDIENT_STOCK/);
  assert.match(migration, /UPDATE public\.gastronomy_ingredients SET/);
  assert.match(salon, /\/api\/rubros\/gastronomy\/orders/);
  assert.doesNotMatch(workspace, /item\.stock - ordered\.quantity/);
  assert.match(salon, /await onOrderCommitted\?/);
  assert.match(salon, /disabled=\{sendingOrder\}/);
});

test('salon y KDS persisten mesas y transiciones por empresa y sucursal', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000017_gastronomy_floor_and_kds.sql'),
    'utf8',
  );
  const tablesRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/tables/route.ts'), 'utf8');
  const ordersRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/orders/route.ts'), 'utf8');
  const salon = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/SalonConsole.tsx'), 'utf8');

  assert.match(migration, /gastronomy_list_tables/);
  assert.match(migration, /gastronomy_save_table/);
  assert.match(migration, /gastronomy_list_kds_orders/);
  assert.match(migration, /gastronomy_update_kds_status/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /INVALID_KDS_TRANSITION/);
  assert.match(tablesRoute, /gastronomy\.orders\.read/);
  assert.match(tablesRoute, /gastronomy\.orders\.write/);
  assert.match(ordersRoute, /export async function GET/);
  assert.match(ordersRoute, /export async function PATCH/);
  assert.match(salon, /refreshOperations/);
  assert.match(salon, /\/api\/rubros\/gastronomy\/tables/);
  assert.doesNotMatch(salon, /const newId = `t-\$\{Date\.now\(\)\}`/);
  assert.doesNotMatch(salon, /COMUNICACIÓN ARCA EXITOSA|76239105432098/);
  assert.doesNotMatch(salon, /window\.location\.assign\(`\/billing/);
});

test('reservas gastronomicas evitan superposiciones y alimentan el salon digital', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000018_gastronomy_reservations.sql'),
    'utf8',
  );
  const route = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/reservations/route.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/gastronomyRepository.ts'), 'utf8');
  const salon = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/SalonConsole.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.gastronomy_reservations/);
  assert.match(migration, /RESERVATION_TIME_CONFLICT/);
  assert.match(migration, /gastronomy_update_reservation_status/);
  assert.match(migration, /Gastronomy reservations by company/);
  assert.match(route, /gastronomy\.reservations\.read/);
  assert.match(route, /gastronomy\.reservations\.write/);
  assert.match(repository, /reservationOverlaps/);
  assert.match(salon, /Agenda de reservas/);
  assert.match(salon, /\/api\/rubros\/gastronomy\/reservations/);
  assert.match(salon, /channel: chat\.extractedType === 'order' \? 'delivery' : 'takeaway'/);
  assert.doesNotMatch(salon, /const kdsId = `k-\$\{Date\.now\(\)\}`/);
  assert.match(config, /salonTab=reservations/);
});

test('compras gastronomicas reciben insumos de forma atomica y aislada', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000019_gastronomy_purchases.sql'),
    'utf8',
  );
  const suppliersRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/suppliers/route.ts'), 'utf8');
  const purchasesRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/purchases/route.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/gastronomyRepository.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/GastronomyWorkspaceConsole.tsx'), 'utf8');
  const purchases = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/GastronomyPurchasesConsole.tsx'), 'utf8');

  [
    'gastronomy_suppliers',
    'gastronomy_purchase_orders',
    'gastronomy_purchase_order_lines',
    'gastronomy_purchase_receipts',
    'gastronomy_purchase_receipt_lines',
  ].forEach((table) => assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`)));
  assert.match(migration, /Gastronomy purchase orders by company/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.gastronomy_receive_purchase_order/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /PURCHASE_OVER_RECEIPT/);
  assert.match(migration, /current_stock \* cost_per_unit/);
  assert.match(suppliersRoute, /gastronomy\.suppliers\.read/);
  assert.match(suppliersRoute, /gastronomy\.suppliers\.write/);
  assert.match(purchasesRoute, /gastronomy\.purchases\.read/);
  assert.match(purchasesRoute, /gastronomy\.purchases\.write/);
  assert.match(purchasesRoute, /gastronomy\.purchases\.receive/);
  assert.match(repository, /receiveGastronomyPurchaseOrder/);
  assert.match(repository, /weightedCost/);
  assert.match(workspace, /GastronomyPurchasesConsole/);
  assert.match(purchases, /Recepcion parcial/);
  assert.match(purchases, /onInventoryChanged/);
});

test('caja gastronomica cobra, divide pagos y cierra mesas con idempotencia', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000020_gastronomy_cash_and_settlements.sql'),
    'utf8',
  );
  const cashRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/cash/route.ts'), 'utf8');
  const settlementRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/settlements/route.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/gastronomyRepository.ts'), 'utf8');
  const salon = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/SalonConsole.tsx'), 'utf8');
  const cash = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/GastronomyCashConsole.tsx'), 'utf8');

  ['gastronomy_settlements', 'gastronomy_settlement_payments'].forEach((table) => {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
  });
  assert.match(migration, /UNIQUE\(company_id, idempotency_key\)/);
  assert.match(migration, /idx_gastronomy_one_open_cash_per_branch/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.gastronomy_settle_table/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /INSERT INTO public\.sales/);
  assert.match(migration, /INSERT INTO public\.caja_movements/);
  assert.match(migration, /UPDATE public\.gastronomy_orders SET status = 'closed'/);
  assert.match(migration, /fiscal_status VARCHAR\(30\) DEFAULT 'pending'/);
  assert.match(cashRoute, /gastronomy\.cash\.read/);
  assert.match(cashRoute, /gastronomy\.cash\.manage/);
  assert.match(settlementRoute, /requiredIdempotencyKey/);
  assert.match(settlementRoute, /gastronomy\.settlements\.create/);
  assert.match(repository, /settleGastronomyTable/);
  assert.match(salon, /Idempotency-Key/);
  assert.match(salon, /Cobrar y cerrar mesa/);
  assert.match(salon, /Propina personalizada/);
  assert.match(cash, /Pendiente ARCA/);
  assert.doesNotMatch(salon, /Ir a Facturacion/);
});

test('supermercado integra catalogo, compras, lotes y POS con stock', () => {
  const registry = fs.readFileSync(path.join(__dirname, 'src/components/workspace/RubroWorkspace.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/supermarket/SupermarketWorkspaceConsole.tsx'), 'utf8');
  const pos = fs.readFileSync(path.join(__dirname, 'src/components/supermarket/SupermarketConsole.tsx'), 'utf8');

  assert.match(registry, /supermarket\/SupermarketWorkspaceConsole/);
  ['#pos', '#catalog', '#inventory', '#purchases', '#lots'].forEach((hash) => assert.match(config, new RegExp(hash)));
  assert.match(workspace, /onSaleCommitted={commitSale}/);
  assert.match(workspace, /api\/rubros\/supermarket\/sales/);
  assert.match(workspace, /Idempotency-Key/);
  assert.match(workspace, /type="file"/);
  assert.match(pos, /await onSaleCommitted/);
  assert.match(pos, /COMPROBANTE INTERNO/);
  assert.doesNotMatch(pos, /Ticket fiscal generado/);
});

test('POS de supermercado confirma caja, venta FEFO y devoluciones en el servidor', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260718000024_supermarket_pos_and_cash.sql'),
    'utf8',
  );
  const salesRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/sales/route.ts'), 'utf8');
  const cashRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/cash/route.ts'), 'utf8');
  const returnsRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/returns/route.ts'), 'utf8');

  ['supermarket_sale_requests', 'supermarket_returns'].forEach((table) => {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
  });
  assert.match(migration, /UNIQUE\(company_id, idempotency_key\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /ORDER BY expiration_date ASC NULLS LAST/);
  assert.match(migration, /INSERT INTO public\.sales/);
  assert.match(migration, /INSERT INTO public\.sale_items/);
  assert.match(migration, /supermarket_return/);
  assert.match(salesRoute, /requiredIdempotencyKey/);
  assert.match(salesRoute, /authorizeRequest\(request, 'supermarket\.sales\.create', 'supermarket'\)/);
  assert.match(cashRoute, /supermarket\.cash\.manage/);
  assert.match(returnsRoute, /supermarket\.returns\.create/);
});

test('supermercado controla conteos, mermas, transferencias y precios masivos', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260718000025_supermarket_inventory_controls.sql'),
    'utf8',
  );
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/supermarket/SupermarketWorkspaceConsole.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/supermarketRepository.ts'), 'utf8');
  const inventoryRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/inventory-events/route.ts'), 'utf8');
  const transferRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/transfers/route.ts'), 'utf8');
  const pricesRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/bulk-prices/route.ts'), 'utf8');

  ['supermarket_inventory_events', 'supermarket_transfers', 'supermarket_transfer_lines', 'supermarket_price_batches', 'supermarket_price_batch_lines'].forEach((table) => {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
  });
  ['supermarket_adjust_inventory', 'supermarket_create_transfer', 'supermarket_apply_bulk_prices'].forEach((fn) => {
    assert.match(migration, new RegExp(`FUNCTION public\\.${fn}`));
    assert.match(repository, new RegExp(`'${fn}'`));
  });
  assert.match(migration, /ORDER BY expiration_date ASC NULLS LAST/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /jsonb_array_length\(p_items\) > 5000/);
  assert.match(inventoryRoute, /supermarket\.inventory\.count/);
  assert.match(inventoryRoute, /supermarket\.inventory\.waste/);
  assert.ok(inventoryRoute.indexOf('resolveTenantContext(request)') < inventoryRoute.indexOf('readJsonObject(request)'));
  assert.match(transferRoute, /supermarket\.inventory\.transfer/);
  assert.match(pricesRoute, /supermarket\.prices\.bulk/);
  assert.match(workspace, /Control operativo/);
  assert.match(config, /supermarket#operations/);
});

test('supermercado organiza gondolas y congela etiquetas auditables', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260718000026_supermarket_layout_and_labels.sql'),
    'utf8',
  );
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/supermarket/SupermarketWorkspaceConsole.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/supermarketRepository.ts'), 'utf8');
  const locationsRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/locations/route.ts'), 'utf8');
  const placementsRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/placements/route.ts'), 'utf8');
  const labelsRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/labels/route.ts'), 'utf8');

  ['supermarket_store_locations', 'supermarket_product_locations', 'supermarket_label_jobs', 'supermarket_label_job_lines'].forEach((table) => {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
  });
  ['supermarket_list_locations', 'supermarket_save_location', 'supermarket_list_placements', 'supermarket_save_placement', 'supermarket_list_label_jobs', 'supermarket_create_label_job', 'supermarket_mark_label_job_printed'].forEach((fn) => {
    assert.match(migration, new RegExp(`FUNCTION public\\.${fn}`));
    assert.match(repository, new RegExp(`'${fn}'`));
  });
  assert.match(migration, /public\.jwt_business_type\(\) = 'supermarket'/);
  assert.match(migration, /jsonb_array_length\(p_items\) > 500/);
  assert.match(migration, /v_product\.price, v_supermarket\.promo/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(locationsRoute, /supermarket\.layout\.write/);
  assert.match(placementsRoute, /supermarket\.layout\.write/);
  assert.match(labelsRoute, /supermarket\.labels\.create/);
  assert.match(labelsRoute, /supermarket\.labels\.print/);
  [locationsRoute, placementsRoute, labelsRoute].forEach((route) => {
    assert.ok(route.indexOf('authorizeRequest(request') < route.indexOf('readJsonObject(request)'));
  });
  assert.match(workspace, /Gondolas y etiquetas/);
  assert.match(workspace, /data-label-sheet/);
  assert.match(config, /supermarket#layout/);
});

test('supermercado persiste fidelizacion, campanas y canjes sin cruzar rubros', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260718000027_supermarket_loyalty.sql'),
    'utf8',
  );
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/supermarket/SupermarketWorkspaceConsole.tsx'), 'utf8');
  const loyalty = fs.readFileSync(path.join(__dirname, 'src/components/supermarket/SupermarketLoyaltyConsole.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/supermarketLoyaltyRepository.ts'), 'utf8');
  const customerRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/loyalty/customers/route.ts'), 'utf8');
  const campaignRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/loyalty/campaigns/route.ts'), 'utf8');
  const rewardRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/loyalty/rewards/route.ts'), 'utf8');
  const movementRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/loyalty/movements/route.ts'), 'utf8');

  ['supermarket_loyalty_customers', 'supermarket_loyalty_campaigns', 'supermarket_loyalty_rewards', 'supermarket_loyalty_movements'].forEach((table) => {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
  });
  ['supermarket_list_loyalty_customers', 'supermarket_save_loyalty_customer', 'supermarket_list_loyalty_campaigns', 'supermarket_save_loyalty_campaign', 'supermarket_list_loyalty_rewards', 'supermarket_save_loyalty_reward', 'supermarket_list_loyalty_movements', 'supermarket_credit_loyalty_purchase', 'supermarket_redeem_loyalty_reward', 'supermarket_adjust_loyalty_points'].forEach((fn) => {
    assert.match(migration, new RegExp(`FUNCTION public\\.${fn}`));
    assert.match(repository, new RegExp(`'${fn}'`));
  });
  assert.match(migration, /JOIN public\.modules m ON m\.code = 'loyalty'/);
  assert.match(migration, /public\.jwt_business_type\(\) = 'supermarket'/);
  assert.match(migration, /pg_advisory_xact_lock/g);
  assert.match(migration, /INSUFFICIENT_LOYALTY_POINTS/);
  assert.match(migration, /LOYALTY_REWARD_OUT_OF_STOCK/);
  assert.match(migration, /UNIQUE\(company_id, idempotency_key\)/);
  assert.match(customerRoute, /supermarket\.loyalty\.customers\.write/);
  assert.match(campaignRoute, /supermarket\.loyalty\.campaigns\.manage/);
  assert.match(rewardRoute, /supermarket\.loyalty\.rewards\.manage/);
  assert.ok(movementRoute.indexOf('resolveTenantContext(request)') < movementRoute.indexOf('readJsonObject(request)'));
  assert.match(movementRoute, /supermarket\.loyalty\.points\.earn/);
  assert.match(movementRoute, /supermarket\.loyalty\.points\.redeem/);
  assert.match(movementRoute, /supermarket\.loyalty\.points\.adjust/);
  assert.match(workspace, /SupermarketLoyaltyConsole/);
  assert.doesNotMatch(workspace, /products\/LoyaltyConsole/);
  assert.match(loyalty, /uploadCatalogImage/);
  assert.match(config, /supermarket#loyalty/);
});

test('supermercado persiste catalogo, compras y lotes con recepcion atomica', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260718000023_supermarket_domain.sql'),
    'utf8',
  );
  const catalogRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/catalog/route.ts'), 'utf8');
  const purchasesRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/purchases/route.ts'), 'utf8');
  const lotsRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/supermarket/lots/route.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/supermarketRepository.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/supermarket/SupermarketWorkspaceConsole.tsx'), 'utf8');

  ['supermarket_products', 'supermarket_purchase_orders', 'supermarket_purchase_order_lines', 'supermarket_stock_lots'].forEach((table) => {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`));
  });
  assert.match(migration, /public\.jwt_business_type\(\) = 'supermarket'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.supermarket_save_product/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.supermarket_receive_purchase/);
  assert.match(migration, /FOR UPDATE/g);
  assert.match(migration, /supermarket_purchase_receipt/);
  assert.match(migration, /quantity_remaining/);
  assert.match(catalogRoute, /authorizeRequest\(request, 'supermarket\.catalog\.read', 'supermarket'\)/);
  assert.match(purchasesRoute, /supermarket\.purchases\.receive/);
  assert.match(lotsRoute, /supermarket\.inventory\.read/);
  assert.match(repository, /supermarket_list_products/);
  assert.match(repository, /supermarket_receive_purchase/);
  assert.match(repository, /NODE_ENV === 'production'/);
  assert.match(workspace, /api\/rubros\/supermarket\/catalog/);
  assert.match(workspace, /uploadCatalogImage/);
  assert.doesNotMatch(workspace, /new FileReader\(\)/);
});

test('ferreteria integra catalogo, ubicaciones, compras y proveedores', () => {
  const registry = fs.readFileSync(path.join(__dirname, 'src/components/workspace/RubroWorkspace.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/hardware/HardwareWorkspaceConsole.tsx'), 'utf8');
  const operation = fs.readFileSync(path.join(__dirname, 'src/components/hardware/HardwareConsole.tsx'), 'utf8');

  assert.match(registry, /hardware\/HardwareWorkspaceConsole/);
  ['#operation', '#catalog', '#stock', '#purchases', '#suppliers'].forEach((hash) => assert.match(config, new RegExp(hash)));
  assert.match(workspace, /onDispatchCreated={reserveDispatch}/);
  assert.match(workspace, /stockMostrador/);
  assert.match(workspace, /type="file"/);
  assert.match(operation, /onDispatchCreated\?/);
});

test('taller integra repuestos, compras, inspecciones y mantenimiento', () => {
  const registry = fs.readFileSync(path.join(__dirname, 'src/components/workspace/RubroWorkspace.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/automotive/AutomotiveWorkspaceConsole.tsx'), 'utf8');
  const workshop = fs.readFileSync(path.join(__dirname, 'src/components/automotive/AutomotiveConsole.tsx'), 'utf8');

  assert.match(registry, /automotive\/AutomotiveWorkspaceConsole/);
  ['#workshop', '#parts', '#purchases', '#inspections', '#maintenance'].forEach((hash) => assert.match(config, new RegExp(hash)));
  assert.match(workspace, /onPartUsed={usePart}/);
  assert.match(workspace, /multiple accept="image\/\*"/);
  assert.match(workspace, /type="file"/);
  assert.match(workshop, /onPartUsed\?/);
});

test('salon de belleza integra servicios, productos, formulas y comisiones', () => {
  const registry = fs.readFileSync(path.join(__dirname, 'src/components/workspace/RubroWorkspace.tsx'), 'utf8');
  const config = fs.readFileSync(path.join(__dirname, 'src/config/businessTypes.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/beauty/BeautyWorkspaceConsole.tsx'), 'utf8');
  const agenda = fs.readFileSync(path.join(__dirname, 'src/components/beauty/BeautyConsole.tsx'), 'utf8');

  assert.match(registry, /beauty\/BeautyWorkspaceConsole/);
  ['#agenda', '#services', '#products', '#formulas', '#team', '#packages'].forEach((hash) => assert.match(config, new RegExp(hash)));
  assert.match(workspace, /onServiceCompleted={completeService}/);
  assert.match(workspace, /type="file"/);
  assert.match(workspace, /formula\.lines/);
  assert.match(agenda, /onServiceCompleted\?/);
});

test('el almacen de la API publica separa catalogos por empresa', async () => {
  const { createCompanyProduct, listCompanyProducts, findCompanyProductBySku } = await publicStoreModule;
  const companyA = '00000000-0000-4000-8000-0000000000a1';
  const companyB = '00000000-0000-4000-8000-0000000000b2';
  createCompanyProduct(companyA, { name: 'Producto empresa A', sku: 'A-001', price: 100, stock: 5 });
  createCompanyProduct(companyB, { name: 'Producto empresa B', sku: 'B-001', price: 200, stock: 8 });
  assert.deepEqual(listCompanyProducts(companyA).map((item) => item.sku), ['A-001']);
  assert.deepEqual(listCompanyProducts(companyB).map((item) => item.sku), ['B-001']);
  assert.equal(findCompanyProductBySku(companyA, 'B-001'), undefined);
});

test('la interfaz no usa fallbacks de datos entre rubros', () => {
  const contextual = fs.readFileSync(path.join(__dirname, 'src/components/workspace/ContextualModuleConsole.tsx'), 'utf8');
  const shell = fs.readFileSync(path.join(__dirname, 'src/components/layout/AppShell.tsx'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/workspace/RubroWorkspace.tsx'), 'utf8');
  const productsApi = fs.readFileSync(path.join(__dirname, 'src/app/api/public/v1/products/route.ts'), 'utf8');
  const retailCatalog = fs.readFileSync(path.join(__dirname, 'src/components/products/ProductCatalog.tsx'), 'utf8');
  assert.doesNotMatch(contextual, /fallbackConsoles/);
  assert.match(contextual, /isContextualModuleSupported/);
  assert.match(contextual, /module-isolation-notice/);
  assert.match(shell, /getIsolatedHref/);
  assert.match(workspace, /<Console key={code}/);
  assert.doesNotMatch(productsApi, /MOCK_DB_PRODUCTS/);
  assert.match(productsApi, /listPersistentCompanyProducts\(auth\.companyId/);
  assert.doesNotMatch(retailCatalog, /Pizza Muzarella|Consulta Médica|value="gastronomy"|value="medical"/);
});

test('la API publica usa persistencia, paginacion e idempotencia para escalar', () => {
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/publicRepository.ts'), 'utf8');
  const auth = fs.readFileSync(path.join(__dirname, 'src/lib/api/publicAuth.ts'), 'utf8');
  const sales = fs.readFileSync(path.join(__dirname, 'src/app/api/public/v1/sales/route.ts'), 'utf8');
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000013_scalability_foundations.sql'),
    'utf8',
  );

  assert.match(repository, /public_api_list_products/);
  assert.match(repository, /nextCursor/);
  assert.match(repository, /NODE_ENV === 'production'/);
  assert.match(auth, /consume_public_api_rate_limit/);
  assert.match(auth, /company_api_keys/);
  assert.match(sales, /requiredIdempotencyKey/);
  assert.match(sales, /enqueuePersistentApiEvent/);
  assert.doesNotMatch(sales, /webhookDispatched:\s*true/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_products_company_sku_unique/);
  assert.match(migration, /UNIQUE\(company_id, event_type, idempotency_key\)/);
});

test('la identidad del tenant usa metadata administrada por el servidor', () => {
  const tenant = fs.readFileSync(path.join(__dirname, 'src/lib/api/tenant.ts'), 'utf8');
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000013_scalability_foundations.sql'),
    'utf8',
  );

  assert.match(tenant, /authData\.user\.app_metadata\.company_id/);
  assert.doesNotMatch(tenant, /authData\.user\.user_metadata\.company_id/);
  assert.match(migration, /request\.jwt\.claims[\s\S]*'app_metadata'/);
  assert.match(migration, /DROP POLICY IF EXISTS "Write business types"/);
  assert.match(migration, /DROP POLICY IF EXISTS "Write business presets"/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.onboard_new_company/);
});

test('el almacen local rechaza SKU duplicado dentro de la misma empresa', async () => {
  const { createCompanyProduct } = await publicStoreModule;
  const companyId = '00000000-0000-4000-8000-0000000000c3';
  createCompanyProduct(companyId, { name: 'Primero', sku: 'DUP-001', price: 10, stock: 1 });
  assert.throws(
    () => createCompanyProduct(companyId, { name: 'Segundo', sku: 'DUP-001', price: 20, stock: 2 }),
    /SKU_ALREADY_EXISTS/,
  );
});

test('la cola local devuelve el mismo evento al repetir una clave idempotente', async () => {
  const { enqueueLocalApiEvent } = await publicStoreModule;
  const companyId = '00000000-0000-4000-8000-0000000000d4';
  const first = enqueueLocalApiEvent(companyId, 'sale.requested', 'sale-order-123', { total: 100 });
  const replay = enqueueLocalApiEvent(companyId, 'sale.requested', 'sale-order-123', { total: 100 });
  assert.equal(first.duplicate, false);
  assert.equal(replay.duplicate, true);
  assert.equal(replay.event.id, first.event.id);
});

test('las tablas comerciales aplican RLS por empresa', () => {
  const rls = fs.readFileSync(path.join(__dirname, '../../packages/database/supabase/migrations/20260709000001_rls_and_helpers.sql'), 'utf8');
  ['clients', 'products', 'stock', 'stock_movements', 'cajas', 'caja_movements', 'sales', 'sale_items', 'invoices'].forEach((table) => {
    assert.match(rls, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
    assert.match(rls, new RegExp(`ON ${table} FOR ALL USING \\(company_id = public\\.jwt_company_id\\(\\)\\)`));
  });
});

test('readJsonObject limita cuerpos grandes antes de procesarlos', async () => {
  const { readJsonObject } = await coreModule;
  const request = new Request('http://localhost/test', {
    method: 'POST',
    headers: { 'content-length': '2048' },
    body: JSON.stringify({ payload: 'pequeno' }),
  });
  await assert.rejects(
    () => readJsonObject(request, 1024),
    (error) => error.status === 413 && error.code === 'PAYLOAD_TOO_LARGE',
  );
});

test('los permisos admiten alcance exacto, global y por dominio', async () => {
  const { hasPermission, permissionMatches } = await permissionRulesModule;
  assert.equal(permissionMatches('sales.create', 'sales.create'), true);
  assert.equal(permissionMatches('platform.*', 'platform.files.create'), true);
  assert.equal(permissionMatches('platform.*', 'gastronomy.orders.create'), false);
  assert.equal(permissionMatches('platform.file*', 'platform.files.create'), false);
  assert.equal(hasPermission(new Set(['contacts.read']), 'contacts.write'), false);
  assert.equal(hasPermission(new Set(['*']), 'healthcare.records.sign'), true);
});

test('el validador de imagen controla tamano, MIME y firma real', async () => {
  const { isValidImageMetadata, isValidImageSignature, normalizeAssetEntityValue } = await imageRulesModule;
  assert.equal(isValidImageMetadata({ size: 1024, type: 'image/png' }), true);
  assert.equal(isValidImageMetadata({ size: 6 * 1024 * 1024, type: 'image/png' }), false);
  assert.equal(isValidImageMetadata({ size: 1024, type: 'image/svg+xml' }), false);
  assert.equal(isValidImageSignature(
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    'image/png',
  ), true);
  assert.equal(isValidImageSignature(Uint8Array.from([1, 2, 3]), 'image/png'), false);
  assert.equal(normalizeAssetEntityValue('menu_items'), 'menu_items');
  assert.equal(normalizeAssetEntityValue('../otra-empresa'), null);
});

test('RBAC y storage quedan aislados por empresa y rubro', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000014_rbac_and_storage.sql'),
    'utf8',
  );
  const uploadRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/uploads/images/route.ts'), 'utf8');
  const internalRoutes = [
    'src/app/api/ai/query/route.ts',
    'src/app/api/billing/emit-invoice/route.ts',
    'src/app/api/billing/invoices/route.ts',
    'src/app/api/billing/test-connection/route.ts',
    'src/app/api/enterprise/branding/route.ts',
    'src/app/api/enterprise/diagnostics/route.ts',
    'src/app/api/enterprise/feature-flags/route.ts',
    'src/app/api/enterprise/impact-simulator/route.ts',
    'src/app/api/imports/route.ts',
    'src/app/api/notifications/route.ts',
    'src/app/api/support/tickets/route.ts',
  ];

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.has_permission/);
  assert.match(migration, /DROP POLICY IF EXISTS "All company users"/);
  assert.match(migration, /ROLE_COMPANY_MISMATCH/);
  assert.match(migration, /BRANCH_COMPANY_MISMATCH/);
  assert.match(migration, /catalog-assets/);
  assert.match(migration, /private-assets/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] = public\.jwt_company_id/);
  assert.match(migration, /storage\.foldername\(name\)\)\[2\] = public\.jwt_business_type/);
  assert.match(uploadRoute, /tenant\.companyId.*tenant\.businessTypeCode.*entity/s);
  internalRoutes.forEach((route) => {
    const source = fs.readFileSync(path.join(__dirname, route), 'utf8');
    assert.match(source, /authorizeRequest\(request,/);
  });
});

test('gastronomia inicia persistencia propia sin reutilizar otro rubro', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260717000015_gastronomy_domain.sql'),
    'utf8',
  );
  const route = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/catalog/route.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/gastronomyRepository.ts'), 'utf8');
  const workspace = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/GastronomyWorkspaceConsole.tsx'), 'utf8');

  [
    'gastronomy_menu_items',
    'gastronomy_ingredients',
    'gastronomy_recipes',
    'gastronomy_recipe_lines',
    'gastronomy_dining_areas',
    'gastronomy_dining_tables',
    'gastronomy_orders',
    'gastronomy_order_items',
  ].forEach((table) => assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`)));
  assert.match(migration, /public\.jwt_business_type\(\) = 'gastronomy'/);
  assert.match(migration, /gastronomy_save_menu_item/);
  assert.match(migration, /INSERT INTO public\.stock_movements/);
  assert.match(route, /authorizeRequest\(request, 'gastronomy\.catalog\.read', 'gastronomy'\)/);
  assert.match(route, /authorizeRequest\(request, 'gastronomy\.catalog\.write', 'gastronomy'\)/);
  assert.match(repository, /NODE_ENV === 'production'/);
  assert.match(workspace, /api\/rubros\/gastronomy\/catalog/);
  assert.match(workspace, /uploadCatalogImage/);
  assert.doesNotMatch(workspace, /new FileReader\(\)/);
});

test('la cola fiscal persiste ventas sin exponer secretos ni inventar CAE', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260718000021_secure_fiscal_queue.sql'),
    'utf8',
  );
  const invoicesRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/billing/invoices/route.ts'), 'utf8');
  const emitRoute = fs.readFileSync(path.join(__dirname, 'src/app/api/billing/emit-invoice/route.ts'), 'utf8');
  const billingConsole = fs.readFileSync(path.join(__dirname, 'src/components/billing/BillingConsole.tsx'), 'utf8');
  const billingRepository = fs.readFileSync(path.join(__dirname, 'src/lib/api/billingRepository.ts'), 'utf8');
  const arcaClient = fs.readFileSync(path.join(__dirname, '../../packages/arca-client/src/index.ts'), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.billing_invoice_items/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.billing_invoice_attempts/);
  assert.match(migration, /idx_invoices_authorized_sequence/);
  assert.match(migration, /idx_invoices_idempotency/);
  assert.match(migration, /idx_invoices_active_sale/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /billing_prepare_sale_invoice/);
  assert.match(migration, /REVOKE ALL ON public\.company_arca_configs FROM anon, authenticated/);
  assert.match(migration, /certificate_secret_ref/);
  assert.match(invoicesRoute, /requiredIdempotencyKey\(request\)/);
  assert.match(billingRepository, /invoice\.businessTypeCode === context\.businessTypeCode/);
  assert.match(emitRoute, /ARCA_TRANSPORT_NOT_IMPLEMENTED/);
  assert.doesNotMatch(emitRoute, /certificateText|privateKeyText|requiredNumber\(body, 'total'/);
  assert.doesNotMatch(billingConsole, /BEGIN PRIVATE KEY|MOCK_ARCA|INITIAL_INVOICES|Math\.random/);
  assert.match(billingConsole, /No genera CAE, numero fiscal ni QR/);
  assert.match(arcaClient, /ARCATransportUnavailableError/);
  assert.doesNotMatch(arcaClient, /mock-token|real-sim|randomCae|Math\.random/);
});

test('reportes gastronomicos agregan ventas reales por empresa, sucursal y periodo', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '../../packages/database/supabase/migrations/20260718000022_gastronomy_reports.sql'),
    'utf8',
  );
  const route = fs.readFileSync(path.join(__dirname, 'src/app/api/rubros/gastronomy/reports/route.ts'), 'utf8');
  const repository = fs.readFileSync(path.join(__dirname, 'src/lib/api/gastronomyRepository.ts'), 'utf8');
  const consoleSource = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/GastronomyReportsConsole.tsx'), 'utf8');
  const salon = fs.readFileSync(path.join(__dirname, 'src/components/gastronomy/SalonConsole.tsx'), 'utf8');

  assert.match(migration, /gastronomy\.reports\.read/);
  assert.match(migration, /gastronomy\.reports\.export/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.gastronomy_sales_report/);
  assert.match(migration, /company_id = p_company_id AND branch_id = p_branch_id/g);
  assert.match(migration, /p_to - p_from > INTERVAL '366 days'/);
  assert.match(migration, /JOIN public\.sale_items/);
  assert.match(migration, /FROM public\.gastronomy_settlement_payments/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.gastronomy_sales_report/);
  assert.match(route, /format === 'csv' \? 'gastronomy\.reports\.export' : 'gastronomy\.reports\.read'/);
  assert.match(route, /authorizeRequest\(request, permission, 'gastronomy'\)/);
  assert.match(route, /Content-Disposition/);
  assert.match(repository, /getGastronomySalesReport/);
  assert.match(consoleSource, /api\/rubros\/gastronomy\/reports/);
  assert.match(consoleSource, /Ventas por dia/);
  assert.doesNotMatch(consoleSource, /DAILY_SALES|TOP_PRODUCTS|Math\.random/);
  assert.match(salon, /activeTab === 'reports'/);
});
