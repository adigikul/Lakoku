import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await admin.auth.admin.createUser({
  email: 'pembaca.uji@lakoku.test',
  password: 'lakoku-uji-123',
  email_confirm: true,
})
console.log(error ? `ERROR: ${error.message}` : `OK user: ${data.user.id}`)
