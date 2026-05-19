UPDATE public.subscriptions s
SET tier = 'essentials', updated_at = now()
FROM auth.users u
WHERE s.user_id = u.id AND u.email = 'david@easyfill.ai';