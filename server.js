// =========================================================================
// MOTOR CENTRAL: NexosCrisSaaS - API MULTI-TENANT GLOBAL
// INFRAESTRUCTURA: Node.js + Express + Supabase Client
// PROPOSITOS: Contabilidad, Inventario Multibodega, POS y Nóminas
// =========================================================================

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-client');

const app = express();
app.use(express.json());
app.use(cors()); // Permite conexiones seguras desde cualquier país

// 1. CONEXIÓN BLINDADA CON SUPABASE
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Llave maestra segura
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Portapapeles de verificación inicial para Render
app.get('/', (req, res) => {
    res.status(200).json({
        status: "ONLINE",
        platform: "NexosCrisSaaS",
        scope: "Global Enterprise Suite (Retail, POS & Payroll)",
        message: "El cerebro del SaaS está encendido y operando correctamente en la nube."
    });
});

// 2. MOTOR "CAMALEÓN": REGISTRO DE NUEVOS COMERCIOS (TENANTS)
app.post('/api/v1/auth/register-business', async (req, res) => {
    const { tax_id, legal_name, country_code, currency_code, economic_activity } = req.body;
    
    try {
        // Registro del inquilino global
        const { data: tenant, error: tError } = await supabase
            .from('tenants')
            .insert([{ tax_id, legal_name, country_code, currency_code }])
            .select()
            .single();

        if (tError) throw tError;

        // Configuración camaleónica automática según su actividad económica
        await supabase
            .from('business_settings')
            .insert([{ tenant_id: tenant.id, economic_activity_name: economic_activity, tax_system_label: 'REGIMEN_GENERAL' }]);

        // Creación automática de sucursal y bodega principal
        const { data: branch } = await supabase
            .from('branches')
            .insert([{ tenant_id: tenant.id, code: 'MAIN-01', name: 'Sede Principal', is_main: true }])
            .select().single();

        await supabase
            .from('warehouses')
            .insert([{ tenant_id: tenant.id, branch_id: branch.id, name: 'Bodega Central Distribución', is_distribution_center: true }]);

        res.status(201).json({ success: true, message: "Comercio internacional creado y aislado con éxito.", tenant_id: tenant.id });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// 3. MOTOR DE PUNTO DE VENTA (POS): PROCESAR VENTA RÁPIDA ESTILO CONSUMO MASIVO
app.post('/api/v1/pos/sale', async (req, res) => {
    const { tenant_id, branch_id, product_id, warehouse_id, quantity, amount, payment_gateway } = req.body;

    try {
        // 1. Registrar el movimiento financiero contable
        const { error: fError } = await supabase
            .from('financial_transactions')
            .withConverter()
            .insert([{ tenant_id, branch_id, transaction_type: 'INCOME', category: 'VENTA_POS', amount, payment_gateway }]);
        
        if (fError) throw fError;

        // 2. Descontar del Kárdex / Inventario la mercancía vendida
        const { error: iError } = await supabase
            .from('inventory_transactions')
            .insert([{ tenant_id, product_id, warehouse_id, transaction_type: 'SALE', quantity: -quantity, notes: 'Venta POS Automatizada' }]);

        if (iError) throw iError;

        res.status(200).json({ success: true, message: "Venta procesada, dinero contabilizado y stock descontado." });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// 4. MOTOR DE NÓMINAS: LIQUIDACIÓN AUTOMÁTICA DE TRABAJADORES Y PRESTADORES
app.post('/api/v1/payroll/liquidate', async (req, res) => {
    const { tenant_id, employee_id, period_start_date, period_end_date } = req.body;

    try {
        // Traer datos del empleado
        const { data: employee } = await supabase.from('employees').select('*').eq('id', employee_id).single();

        let gross_earnings = employee.base_salary;
        let deductions = contract_type === 'PLANTA' ? (gross_earnings * 0.08) : 0.00; // Simulación de salud/pensión si es fijo
        let net_paid = gross_earnings - deductions;

        // Inyectar en el archivero de liquidaciones
        await supabase.from('payroll_liquidations').insert([{
            tenant_id, employee_id, period_start_date, period_end_date,
            gross_earnings, tax_deductions: deductions, net_paid, is_processed: true
        }]);

        // Registrar el gasto salarial automático en la contabilidad general del negocio
        await supabase.from('financial_transactions').insert([{
            tenant_id, branch_id: req.body.branch_id, transaction_type: 'EXPENSE', category: 'NOMINA_EMPLEADOS', amount: net_paid
        }]);

        res.status(200).json({ success: true, message: "Nómina liquidada y egreso contable registrado con éxito." });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ESCUCHA MUNDIAL
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`NexosCrisSaaS corriendo globalmente en el puerto ${PORT}`));
