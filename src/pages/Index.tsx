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
import { STICKER_PACKS } from '@/lib/stickers';
import { uploadImage, startAudioRecording } from '@/lib/media';

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
  username?: string;
  avatar_url?: string;
  created_by?: number;
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
  const [newChatName, setNewChatName] = useState('');
  const [newChatUsername, setNewChatUsername] = useState('');
  const [newChatType, setNewChatType] = useState<'channel' | 'group'>('channel');
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [searchChats, setSearchChats] = useState('');
  const [foundUsers, setFoundUsers] = useState<User[]>([]);
  const [foundChats, setFoundChats] = useState<Chat[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [chatAvatarPreview, setChatAvatarPreview] = useState<string>('');
  const [selectedAvatarSticker, setSelectedAvatarSticker] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const chatAvatarInputRef = useRef<HTMLInputElement>(null);

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
      setShowMobileSidebar(false);
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

  const createChat = async () => {
    if (!newChatName.trim() || !user) {
      toast.error('Введите название');
      return;
    }

    if (newChatUsername.trim() && !/^[a-z0-9_]+$/.test(newChatUsername.trim())) {
      toast.error('Username может содержать только a-z, 0-9, _');
      return;
    }

    try {
      const response = await fetch(API.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChatName.trim(),
          type: newChatType,
          user_id: user.id,
          username: newChatUsername.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Ошибка создания');
        return;
      }

      const newChat = await response.json();
      setChats([newChat, ...chats]);
      setNewChatName('');
      setNewChatUsername('');
      setIsCreateChatOpen(false);
      toast.success('Чат создан!');
    } catch (error) {
      toast.error('Ошибка создания чата');
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

  const searchForChats = async () => {
    try {
      const response = await fetch(`${API.chats}?search=${searchChats}`);
      const data = await response.json();
      setFoundChats(data);
    } catch (error) {
      toast.error('Ошибка поиска');
    }
  };

  useEffect(() => {
    if (searchUsers.trim() && isSearchOpen) {
      const timer = setTimeout(searchForUsers, 300);
      return () => clearTimeout(timer);
    } else {
      setFoundUsers([]);
    }
  }, [searchUsers, isSearchOpen]);

  useEffect(() => {
    if (searchChats.trim() && isSearchOpen) {
      const timer = setTimeout(searchForChats, 300);
      return () => clearTimeout(timer);
    } else {
      setFoundChats([]);
    }
  }, [searchChats, isSearchOpen]);

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
      setIsSearchOpen(false);
      setSearchUsers('');
      toast.success(`Чат с ${otherUser.display_name} открыт`);
    } catch (error) {
      toast.error('Ошибка создания чата');
    }
  };

  const joinChat = async (chat: Chat) => {
    if (!user) return;

    loadChats();
    setSelectedChat(chat);
    setIsSearchOpen(false);
    setSearchChats('');
    toast.success(`Открыт ${chat.name}`);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user && selectedChat) {
      try {
        toast.info('Загрузка фото...');
        const url = await uploadImage(file);
        await sendMessage('📷 Фото', 'photo', url);
        toast.success('Фото отправлено!');
      } catch (error) {
        toast.error('Ошибка загрузки фото');
      }
    }
  };

  const updateAvatar = async () => {
    if (!user) return;

    let avatarUrl = selectedAvatarSticker;
    if (!avatarUrl && avatarPreview) {
      avatarUrl = 'https://cdn.poehali.dev/files/ecfd373b-9db9-4881-940f-e820de5e9b74.png';
    }
    avatarUrl = avatarUrl || user.avatar_url || null;

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

  const updateChatAvatar = async () => {
    if (!user || !selectedChat) return;

    if (selectedChat.created_by !== user.id) {
      toast.error('Только создатель может изменить аватар');
      return;
    }

    const avatar_url = chatAvatarPreview || selectedChat.avatar_url || null;

    try {
      const response = await fetch(API.chats, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: selectedChat.id,
          user_id: user.id,
          avatar_url: avatar_url,
        }),
      });

      if (!response.ok) {
        toast.error('Ошибка обновления');
        return;
      }

      loadChats();
      toast.success('Аватар группы обновлён!');
      setIsChatSettingsOpen(false);
      setChatAvatarPreview('');
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const handleChatAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const recorder = await startAudioRecording();
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');

        try {
          toast.info('Загрузка аудио...');
          const response = await fetch('https://cdn.poehali.dev/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          await sendMessage('🎤 Голосовое сообщение', 'audio', data.url);
          toast.success('Аудио отправлено!');
        } catch (error) {
          toast.error('Ошибка отправки аудио');
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.info('Запись началась...');
    } catch (error) {
      toast.error('Нет доступа к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const startVideoCall = () => {
    if (!selectedChat || !user) return;
    toast.info('📞 Видеозвонки скоро появятся!');
  };

  const deleteMessage = async (messageId: number) => {
    if (!user) return;

    try {
      const response = await fetch(API.messages, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          user_id: user.id,
        }),
      });

      if (response.ok) {
        setMessages(messages.filter((m) => m.id !== messageId));
        toast.success('Сообщение удалено');
      } else {
        toast.error('Не удалось удалить');
      }
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const getChatTitle = (chat: Chat) => {
    if (chat.type === 'private' && chat.other_user) {
      return chat.other_user.display_name;
    }
    return chat.name;
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.avatar_url) return chat.avatar_url;
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
    <div className="h-screen flex bg-background overflow-hidden">
      <div
        className={`${
          showMobileSidebar ? 'w-full' : 'hidden'
        } md:flex md:w-20 lg:w-80 border-r border-border flex-col transition-all`}
      >
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
                        <AvatarImage
                          src={
                            avatarPreview ||
                            `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><text x="48" y="48" font-size="48" text-anchor="middle" dy=".35em">${selectedAvatarSticker}</text></svg>`
                          }
                        />
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

            <div className="hidden lg:block">
              <h2 className="font-semibold text-lg">Чаты</h2>
            </div>
          </div>

          <div className="flex gap-1">
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Icon name="Search" size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Поиск</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="users" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="users">Пользователи</TabsTrigger>
                    <TabsTrigger value="chats">Чаты/Каналы</TabsTrigger>
                  </TabsList>
                  <TabsContent value="users" className="space-y-4">
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
                              <div className="text-sm text-muted-foreground">
                                @{foundUser.username}
                              </div>
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
                  </TabsContent>
                  <TabsContent value="chats" className="space-y-4">
                    <Input
                      placeholder="Поиск по @username или названию..."
                      value={searchChats}
                      onChange={(e) => setSearchChats(e.target.value)}
                    />
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {foundChats.map((foundChat) => (
                          <div
                            key={foundChat.id}
                            onClick={() => joinChat(foundChat)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary cursor-pointer"
                          >
                            <Avatar>
                              {foundChat.avatar_url ? (
                                <AvatarImage src={foundChat.avatar_url} />
                              ) : (
                                <AvatarFallback
                                  style={{
                                    backgroundColor:
                                      foundChat.type === 'channel' ? '#0088cc' : '#27ae60',
                                  }}
                                >
                                  {foundChat.type === 'channel' ? '#' : 'G'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{foundChat.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {foundChat.username ? `@${foundChat.username}` : foundChat.type}
                              </div>
                            </div>
                          </div>
                        ))}
                        {searchChats && foundChats.length === 0 && (
                          <div className="text-center text-muted-foreground py-8">
                            Чаты не найдены
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateChatOpen} onOpenChange={setIsCreateChatOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Icon name="Plus" size={20} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать чат</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Тип</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={newChatType === 'channel' ? 'default' : 'outline'}
                        onClick={() => setNewChatType('channel')}
                        className="flex-1"
                      >
                        Канал
                      </Button>
                      <Button
                        variant={newChatType === 'group' ? 'default' : 'outline'}
                        onClick={() => setNewChatType('group')}
                        className="flex-1"
                      >
                        Группа
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chatName">Название</Label>
                    <Input
                      id="chatName"
                      placeholder="Мой чат"
                      value={newChatName}
                      onChange={(e) => setNewChatName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && createChat()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chatUsername">Username (необязательно)</Label>
                    <Input
                      id="chatUsername"
                      placeholder="mychat"
                      value={newChatUsername}
                      onChange={(e) => setNewChatUsername(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && createChat()}
                    />
                    <p className="text-xs text-muted-foreground">
                      Можно использовать: a-z, 0-9, _
                    </p>
                  </div>
                  <Button onClick={createChat} className="w-full">
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
                    {chat.avatar_url ? (
                      <AvatarImage src={chat.avatar_url} />
                    ) : chat.type === 'private' && chat.other_user?.avatar_url ? (
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
                <div className="flex-1 min-w-0 hidden lg:block">
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
                        {chat.last_message_type === 'sticker'
                          ? '🎨 Стикер'
                          : chat.last_message_type === 'photo'
                          ? '📷 Фото'
                          : chat.last_message_type === 'audio'
                          ? '🎤 Аудио'
                          : chat.last_message}
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

      <div className={`${showMobileSidebar ? 'hidden' : 'flex'} md:flex flex-1 flex-col`}>
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border bg-card flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setShowMobileSidebar(true)}
              >
                <Icon name="ArrowLeft" size={20} />
              </Button>
              <Avatar
                className="cursor-pointer"
                onClick={() =>
                  selectedChat.type !== 'private' && setIsChatSettingsOpen(true)
                }
              >
                {selectedChat.avatar_url ? (
                  <AvatarImage src={selectedChat.avatar_url} />
                ) : selectedChat.type === 'private' && selectedChat.other_user?.avatar_url ? (
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
                    : selectedChat.username
                    ? `@${selectedChat.username}`
                    : selectedChat.type === 'channel'
                    ? 'Канал'
                    : selectedChat.type === 'group'
                    ? 'Группа'
                    : 'Личный чат'}
                </p>
              </div>
              {selectedChat.type === 'private' && (
                <Button variant="ghost" size="icon" onClick={startVideoCall}>
                  <Icon name="Video" size={20} />
                </Button>
              )}
            </div>

            <Dialog open={isChatSettingsOpen} onOpenChange={setIsChatSettingsOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Настройки чата</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {selectedChat.created_by === user.id ? (
                    <>
                      <div className="flex flex-col items-center gap-4">
                        <Avatar className="w-24 h-24">
                          {chatAvatarPreview ? (
                            <AvatarImage src={chatAvatarPreview} />
                          ) : selectedChat.avatar_url ? (
                            <AvatarImage src={selectedChat.avatar_url} />
                          ) : (
                            <AvatarFallback
                              style={{
                                backgroundColor:
                                  selectedChat.type === 'channel' ? '#0088cc' : '#27ae60',
                              }}
                            >
                              {selectedChat.type === 'channel' ? '#' : 'G'}
                            </AvatarFallback>
                          )}
                        </Avatar>

                        <div className="flex gap-2">
                          <input
                            type="file"
                            ref={chatAvatarInputRef}
                            onChange={handleChatAvatarChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            onClick={() => chatAvatarInputRef.current?.click()}
                          >
                            <Icon name="Upload" size={16} className="mr-2" />
                            Изменить аватар
                          </Button>
                        </div>
                      </div>

                      <Button onClick={updateChatAvatar} className="w-full">
                        Сохранить изменения
                      </Button>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Только создатель может изменять настройки
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 group ${msg.user.id === user.id ? 'flex-row-reverse' : ''}`}
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
                      <div className="relative group">
                        <div
                          className={`inline-block p-3 rounded-2xl ${
                            msg.user.id === user.id
                              ? 'bg-primary text-primary-foreground rounded-tr-none'
                              : 'bg-secondary rounded-tl-none'
                          }`}
                        >
                          {msg.message_type === 'sticker' ? (
                            <span className="text-5xl">{msg.content}</span>
                          ) : msg.message_type === 'photo' && msg.media_url ? (
                            <div>
                              <img
                                src={msg.media_url}
                                alt="photo"
                                className="rounded-lg max-w-xs mb-2"
                              />
                              <div>{msg.content}</div>
                            </div>
                          ) : msg.message_type === 'audio' && msg.media_url ? (
                            <div className="flex flex-col gap-2">
                              <audio controls src={msg.media_url} className="max-w-xs" />
                              <div>{msg.content}</div>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                        {msg.user.id === user.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteMessage(msg.id)}
                          >
                            <Icon name="Trash2" size={16} />
                          </Button>
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
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handlePhotoSend}
                  accept="image/*"
                  className="hidden"
                />
                <Button variant="ghost" size="icon" onClick={() => photoInputRef.current?.click()}>
                  <Icon name="Image" size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}
                >
                  <Icon name="Mic" size={20} />
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
