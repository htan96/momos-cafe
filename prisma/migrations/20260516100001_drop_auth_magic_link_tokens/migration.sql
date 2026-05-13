-- Legacy magic-link auth removed; Cognito is the sole IdP.
DROP TABLE IF EXISTS "auth_magic_link_tokens";
