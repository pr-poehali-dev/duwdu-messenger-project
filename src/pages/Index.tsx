import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { STICKER_PACKS, StickerPack } from '@/lib/stickers';

const API = {
  auth: 'https://functions.poehali.dev/1fdd0be6-6d60-4bdd-8af2-1f0f6c40c21f',
  chats: 'https://functions.poehali.dev/1ff51085-bf88-4077-bab1-4abdf05a3922',
  messages: 'https://functions.poehali.dev/25f6ac70-2049-4f7d-ba39-2691a2f2b7ab',
  users: 'https://functions.poehali.dev/a87a4587-2fd5-4ba2-8416-35724f536cf2',
};

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url?: string;
  bio?: string;
  is_online?: boolean;
}

interface Chat {
  id: number;
  name: string;
  type: string;
  last_message?: string;
  last_message_time?: string;
  last_message_type?: string;
  unread_count?: number;
  other_user?: User;
}

interface Message {
  id: number;
  content: string;
  message_type: string;
  created_at: string;
  media_url?: string;
  user: User;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [foundUsers, setFoundUsers] = useState<User[]>([]);
  const [isSearchUsersOpen, setIsSearchUsersOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [selectedAvatarSticker, setSelectedAvatarSticker] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const savedUser = localStorage.getItem('duwdu_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    if (isRegister && !displayName.trim()) {
      toast.error('Введите отображаемое имя');
      return;
    }

    try {
      const response = await fetch(API.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isRegister ? 'register' : 'login',
          username: username.trim(),
          password: password.trim(),
          display_name: displayName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Ошибка авторизации');
        return;
      }

      setUser(data);
      localStorage.setItem('duwdu_user', JSON.stringify(data));
      toast.success(isRegister ? 'Регистрация успешна!' : `Добро пожаловать, ${data.display_name}!`);
    } catch (error) {
      toast.error('Ошибка соединения');
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

  const sendMessage = async (content?: string, messageType: string = 'text', mediaUrl?: string) => {
    const textContent = content || messageInput.trim();
    if (!textContent && !mediaUrl) return;
    if (!user || !selectedChat) return;

    try {
      const response = await fetch(API.messages, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: selectedChat.id,
          user_id: user.id,
          content: textContent,
          message_type: messageType,
          media_url: mediaUrl,
        }),
      });

      const newMessage = await response.json();
      setMessages([...messages, newMessage]);
      setMessageInput('');
      setShowStickers(false);
      loadChats();
    } catch (error) {
      toast.error('Ошибка отправки');
    }
  };

  const sendSticker = (emoji: string) => {
    sendMessage(emoji, 'sticker');
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

  const searchForUsers = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${API.users}?search=${searchUsers}&user_id=${user.id}`);
      const data = await response.json();
      setFoundUsers(data);
    } catch (error) {
      toast.error('Ошибка поиска');
    }
  };

  useEffect(() => {
    if (searchUsers.trim() && isSearchUsersOpen) {
      const timer = setTimeout(searchForUsers, 300);
      return () => clearTimeout(timer);
    } else {
      setFoundUsers([]);
    }
  }, [searchUsers, isSearchUsersOpen]);

  const startPrivateChat = async (otherUser: User) => {
    if (!user) return;

    try {
      const response = await fetch(API.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'private',
          user_id: user.id,
          other_user_id: otherUser.id,
        }),
      });

      const chat = await response.json();
      loadChats();
      setSelectedChat(chat);
      setIsSearchUsersOpen(false);
      setSearchUsers('');
      toast.success(`Чат с ${otherUser.display_name} открыт`);
    } catch (error) {
      toast.error('Ошибка создания чата');
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateAvatar = async () => {
    if (!user) return;

    const avatarUrl = selectedAvatarSticker || avatarPreview || user.avatar_url || null;

    try {
      const response = await fetch(API.auth, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          avatar_url: avatarUrl,
        }),
      });

      const data = await response.json();
      setUser(data);
      localStorage.setItem('duwdu_user', JSON.stringify(data));
      toast.success('Аватар обновлён!');
      setIsProfileOpen(false);
      setAvatarPreview('');
      setSelectedAvatarSticker('');
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const getChatTitle = (chat: Chat) => {
    if (chat.type === 'private' && chat.other_user) {
      return chat.other_user.display_name;
    }
    return chat.name;
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'private' && chat.other_user) {
      return chat.other_user.avatar_url || chat.other_user.avatar_color;
    }
    return chat.type === 'channel' ? '#0088cc' : '#27ae60';
  };

  const getChatAvatarLetter = (chat: Chat) => {
    if (chat.type === 'private' && chat.other_user) {
      return chat.other_user.display_name[0].toUpperCase();
    }
    return chat.type === 'channel' ? '#' : chat.name[0].toUpperCase();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 mx-auto bg-primary rounded-full flex items-center justify-center">
              <Icon name="Send" size={40} className="text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">DUWDU</h1>
            <p className="text-muted-foreground">
              {isRegister ? 'Создайте аккаунт' : 'Войдите в мессенджер'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input
                id="username"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Отображаемое имя</Label>
                <Input
                  id="displayName"
                  placeholder="Как вас зовут?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                />
              </div>
            )}

            <Button onClick={handleAuth} className="w-full" size="lg">
              {isRegister ? 'Зарегистрироваться' : 'Войти'}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setIsRegister(!isRegister)}
              className="w-full"
            >
              {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      <div className="w-full max-w-sm border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
              <DialogTrigger asChild>
                <Avatar className="cursor-pointer">
                  {user.avatar_url ? (
                    <AvatarImage src={user.avatar_url} />
                  ) : (
                    <AvatarFallback style={{ backgroundColor: user.avatar_color }}>
                      {user.display_name[0].toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Профиль</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="w-24 h-24">
                      {avatarPreview || selectedAvatarSticker ? (
                        <AvatarImage src={avatarPreview || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><text x="48" y="48" font-size="48" text-anchor="middle" dy=".35em">${selectedAvatarSticker}</text></svg>`} />
                      ) : user.avatar_url ? (
                        <AvatarImage src={user.avatar_url} />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: user.avatar_color }}>
                          {user.display_name[0].toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Icon name="Upload" size={16} className="mr-2" />
                        Загрузить фото
                      </Button>
                    </div>

                    <div className="w-full">
                      <Label className="mb-2 block">Или выберите стикер:</Label>
                      <div className="grid grid-cols-6 gap-2">
                        {STICKER_PACKS.emotions.slice(0, 12).map((sticker) => (
                          <button
                            key={sticker.id}
                            onClick={() => {
                              setSelectedAvatarSticker(sticker.emoji);
                              setAvatarPreview('');
                            }}
                            className={`text-3xl p-2 rounded hover:bg-secondary transition-colors ${
                              selectedAvatarSticker === sticker.emoji ? 'bg-secondary' : ''
                            }`}
                          >
                            {sticker.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Имя пользователя</Label>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                  </div>

                  <div className="space-y-2">
                    <Label>Отображаемое имя</Label>
                    <div className="text-sm">{user.display_name}</div>
                  </div>

                  <Button onClick={updateAvatar} className="w-full">
                    Сохранить изменения
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div>
              <h2 className="font-semibold text-lg">Чаты</h2>
            </div>
          </div>

          <div className="flex gap-1">
            <Dialog open={isSearchUsersOpen} onOpenChange={setIsSearchUsersOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Icon name="UserPlus" size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Найти пользователя</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Поиск по имени..."
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                  />
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {foundUsers.map((foundUser) => (
                        <div
                          key={foundUser.id}
                          onClick={() => startPrivateChat(foundUser)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary cursor-pointer"
                        >
                          <Avatar>
                            {foundUser.avatar_url ? (
                              <AvatarImage src={foundUser.avatar_url} />
                            ) : (
                              <AvatarFallback style={{ backgroundColor: foundUser.avatar_color }}>
                                {foundUser.display_name[0].toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{foundUser.display_name}</div>
                            <div className="text-sm text-muted-foreground">@{foundUser.username}</div>
                          </div>
                          {foundUser.is_online && (
                            <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </div>
                      ))}
                      {searchUsers && foundUsers.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          Пользователи не найдены
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

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
        </div>

        <ScrollArea className="flex-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 cursor-pointer transition-colors border-b border-border hover:bg-secondary/50 ${
                selectedChat?.id === chat.id ? 'bg-secondary' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    {chat.type === 'private' && chat.other_user?.avatar_url ? (
                      <AvatarImage src={chat.other_user.avatar_url} />
                    ) : (
                      <AvatarFallback
                        style={{
                          backgroundColor:
                            chat.type === 'private' && chat.other_user
                              ? chat.other_user.avatar_color
                              : getChatAvatar(chat),
                        }}
                      >
                        {getChatAvatarLetter(chat)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {chat.type === 'private' && chat.other_user?.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium truncate">{getChatTitle(chat)}</h3>
                    {chat.last_message_time && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(chat.last_message_time).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  {chat.last_message && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {chat.last_message_type === 'sticker' ? '🎨 Стикер' : chat.last_message}
                      </p>
                      {chat.unread_count && chat.unread_count > 0 && (
                        <div className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {chat.unread_count}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Avatar>
                  {selectedChat.type === 'private' && selectedChat.other_user?.avatar_url ? (
                    <AvatarImage src={selectedChat.other_user.avatar_url} />
                  ) : (
                    <AvatarFallback
                      style={{
                        backgroundColor:
                          selectedChat.type === 'private' && selectedChat.other_user
                            ? selectedChat.other_user.avatar_color
                            : getChatAvatar(selectedChat),
                      }}
                    >
                      {getChatAvatarLetter(selectedChat)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold">{getChatTitle(selectedChat)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.type === 'private' && selectedChat.other_user?.is_online
                      ? 'онлайн'
                      : selectedChat.type === 'channel'
                      ? 'Канал'
                      : selectedChat.type === 'group'
                      ? 'Группа'
                      : 'Личный чат'}
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.user.id === user.id ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-10 h-10">
                      {msg.user.avatar_url ? (
                        <AvatarImage src={msg.user.avatar_url} />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: msg.user.avatar_color }}>
                          {msg.user.display_name[0].toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className={`flex-1 max-w-md`}>
                      {msg.user.id !== user.id && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-primary">
                            {msg.user.display_name}
                          </span>
                        </div>
                      )}
                      <div
                        className={`inline-block p-3 rounded-2xl ${
                          msg.user.id === user.id
                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-secondary rounded-tl-none'
                        }`}
                      >
                        {msg.message_type === 'sticker' ? (
                          <span className="text-5xl">{msg.content}</span>
                        ) : (
                          msg.content
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {showStickers && (
              <div className="border-t border-border bg-card p-4">
                <Tabs defaultValue="emotions" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="emotions">😊</TabsTrigger>
                    <TabsTrigger value="hands">👋</TabsTrigger>
                    <TabsTrigger value="hearts">❤️</TabsTrigger>
                    <TabsTrigger value="animals">🐶</TabsTrigger>
                  </TabsList>
                  {Object.entries(STICKER_PACKS).map(([packName, stickers]) => (
                    <TabsContent key={packName} value={packName} className="mt-4">
                      <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
                        {stickers.map((sticker) => (
                          <button
                            key={sticker.id}
                            onClick={() => sendSticker(sticker.emoji)}
                            className="text-4xl p-2 rounded hover:bg-secondary transition-colors"
                            title={sticker.name}
                          >
                            {sticker.emoji}
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowStickers(!showStickers)}
                  className={showStickers ? 'bg-secondary' : ''}
                >
                  <Icon name="Smile" size={20} />
                </Button>
                <Button variant="ghost" size="icon">
                  <Icon name="Paperclip" size={20} />
                </Button>
                <Input
                  placeholder="Сообщение..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={() => sendMessage()} size="icon">
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Icon name="MessageCircle" size={64} className="text-primary" />
              </div>
              <h3 className="text-2xl font-semibold">Выберите чат</h3>
              <p className="text-muted-foreground">Начните общение в DUWDU</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
