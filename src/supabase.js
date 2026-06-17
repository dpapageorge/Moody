import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://onddijpntloejoicoaeb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZGRpanBudGxvZWpvaWNvYWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NjA1ODIsImV4cCI6MjA5NzIzNjU4Mn0.geW3AFRQIgtfoF4rzqOmKBaZEOLxJDW8jAZn3EtH6jg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
