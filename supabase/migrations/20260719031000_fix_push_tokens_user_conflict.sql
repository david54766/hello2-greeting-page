ALTER TABLE public.push_tokens
  DROP CONSTRAINT IF EXISTS push_tokens_token_key;

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_user_token_key
  ON public.push_tokens(user_id, token);
