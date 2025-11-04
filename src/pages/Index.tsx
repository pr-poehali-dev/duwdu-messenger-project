import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const API = {
  auth: 'https://functions.poehali.dev/1fdd0be6-6d60-4bdd-8af2-1f0f6c40c21f',
  chats: 'https://functions.poehali.dev/1ff51085-bf88-4077-bab1-4abdf05a3922',
  messages: 'https://functions.poehali.dev/25f6ac70-2049-4f7d-ba39-2691a2f2b7ab',
};

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
}

interface Chat {
  id: number;
  name: string;
  type: string;
  last_message?: string;
  last_message_time?: string;
}

interface Message {
  id: number;
  content: string;
  message_type: string;
  created_at: string;
  user: User;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  const handleLogin = async () => {
    if (!username.trim() || !displayName.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      const response = await fetch(API.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), display_name: displayName.trim() }),
      });

      const data = await response.json();
      setUser(data);
      localStorage.setItem('duwdu_user', JSON.stringify(data));
      toast.success(`Добро пожаловать, ${data.display_name}!`);
    } catch (error) {
      toast.error('Ошибка входа');
    }
  };

  const loadChats = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${API.chats}?user_id=${user.id}`);
      const data = await response.json();
      setChats(data);
      
      if (data.length > 0 && !selectedChat) {
        setSelectedChat(data[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки чатов', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedChat) return;

    try {
      const response = await fetch(`${API.messages}?chat_id=${selectedChat.id}`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Ошибка загрузки сообщений', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !selectedChat) return;

    try {
      const response = await fetch(API.messages, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: selectedChat.id,
          user_id: user.id,
          content: messageInput.trim(),
          message_type: 'text',
        }),
      });

      const newMessage = await response.json();
      setMessages([...messages, newMessage]);
      setMessageInput('');
      loadChats();
    } catch (error) {
      toast.error('Ошибка отправки');
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !user) {
      toast.error('Введите название канала');
      return;
    }

    try {
      const response = await fetch(API.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelName.trim(),
          type: 'channel',
          user_id: user.id,
        }),
      });

      const newChat = await response.json();
      setChats([newChat, ...chats]);
      setNewChannelName('');
      setIsCreateChannelOpen(false);
      toast.success('Канал создан!');
    } catch (error) {
      toast.error('Ошибка создания канала');
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('duwdu_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-primary">DUWDU</h1>
            <p className="text-muted-foreground">Вход в мессенджер</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                placeholder="Введите username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Отображаемое имя</Label>
              <Input
                id="displayName"
                placeholder="Как вас зовут?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            
            <Button onClick={handleLogin} className="w-full" size="lg">
              Войти
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback style={{ backgroundColor: user.avatar_color }}>
                {user.display_name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{user.display_name}</h2>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </div>
          
          <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Icon name="Plus" size={20} />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Создать канал</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="channelName">Название канала</Label>
                  <Input
                    id="channelName"
                    placeholder="Мой канал"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && createChannel()}
                  />
                </div>
                <Button onClick={createChannel} className="w-full">
                  Создать
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 cursor-pointer transition-colors border-b border-border hover:bg-secondary ${
                selectedChat?.id === chat.id ? 'bg-secondary' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {chat.type === 'channel' ? <Icon name="Hash" size={20} /> : <Icon name="MessageCircle" size={20} />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium truncate">{chat.name}</h3>
                    {chat.last_message_time && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(chat.last_message_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {chat.last_message && (
                    <p className="text-sm text-muted-foreground truncate">{chat.last_message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedChat.type === 'channel' ? <Icon name="Hash" size={20} /> : <Icon name="MessageCircle" size={20} />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{selectedChat.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.type === 'channel' ? 'Канал' : selectedChat.type === 'group' ? 'Группа' : 'Личный чат'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.user.id === user.id ? 'flex-row-reverse' : ''}`}>
                  <Avatar>
                    <AvatarFallback style={{ backgroundColor: msg.user.avatar_color }}>
                      {msg.user.display_name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-md ${msg.user.id === user.id ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.user.display_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`p-3 rounded-lg ${msg.user.id === user.id ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Icon name="Paperclip" size={20} />
                </Button>
                <Input
                  placeholder="Написать сообщение..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage}>
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Icon name="MessageCircle" size={64} className="mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">Выберите чат</h3>
              <p className="text-muted-foreground">Начните общение в DUWDU</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
