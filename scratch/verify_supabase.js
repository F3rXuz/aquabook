
const { createClient } = require('@supabase/supabase-js');

const SUBAPASE_URL = "https://urbxknlrzokdsbyhfirl.supabase.co";
const SUPABASE_KEY = "sb_publishable_q7SZ54CZAxK8naqTf8gWJg_UViEPakb";
const _supabase = createClient(SUBAPASE_URL, SUPABASE_KEY);

async function checkVotos() {
    const { data, count, error } = await _supabase
        .from('votos')
        .select('*', { count: 'exact' });
        
    if (error) {
        console.error("Error connecting to Supabase:", error.message);
    } else {
        console.log(`Connection successful! Total votes in DB: ${count}`);
        console.log("Sample data:", JSON.stringify(data.slice(0, 5)));
    }
}

checkVotos();
