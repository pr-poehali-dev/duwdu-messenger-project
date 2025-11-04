-- Add password and avatar fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add online status
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Update messages table to support stickers
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type IN ('text', 'audio', 'video', 'image', 'sticker'));

-- Add media_url for stickers and images
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Create index for finding private chats
CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);

-- Add unread messages counter
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;