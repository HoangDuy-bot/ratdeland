import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nfocduuucvbcacpcivep.supabase.co";
const supabaseAnonKey = "sb_publishable_faq_GAKWWJ5HbdilMNTPCg__vnndfQ6";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
