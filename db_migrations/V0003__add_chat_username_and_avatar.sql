ALTER TABLE chats 
ADD COLUMN username VARCHAR(50) UNIQUE,
ADD COLUMN avatar_url TEXT,
ADD COLUMN description TEXT;

ALTER TABLE messages 
ADD COLUMN removed_at TIMESTAMP;

CREATE INDEX idx_chats_username ON chats(username) WHERE username IS NOT NULL;