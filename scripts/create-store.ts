import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import readline from 'node:readline/promises';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const storeName = await rl.question('Nome da loja: ');
  const adminName = await rl.question('Nome do administrador: ');
  const adminEmail = await rl.question('E-mail do administrador: ');
  const adminPassword = await rl.question('Senha inicial do administrador: ');

  rl.close();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert({ store_name: storeName })
    .select()
    .single();

  if (storeError || !store) {
    console.error('Erro ao criar loja:', storeError?.message);
    process.exit(1);
  }

  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (userError || !user.user) {
    console.error('Erro ao criar usuário administrador:', userError?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.user.id,
    store_id: store.id,
    name: adminName,
    email: adminEmail,
    role: 'Administrador',
    status: 'ativo',
    avatar_color: 'bg-brand-600',
  });

  if (profileError) {
    console.error('Erro ao criar perfil do administrador:', profileError.message);
    process.exit(1);
  }

  console.log(`\nLoja "${storeName}" criada com sucesso.`);
  console.log(`Login do administrador: ${adminEmail}`);
}

main();
