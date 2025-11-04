export const STICKER_PACKS = {
  emotions: [
    { id: 'smile', emoji: '😊', name: 'Улыбка' },
    { id: 'laugh', emoji: '😂', name: 'Смех' },
    { id: 'love', emoji: '😍', name: 'Любовь' },
    { id: 'cool', emoji: '😎', name: 'Крутой' },
    { id: 'thinking', emoji: '🤔', name: 'Думаю' },
    { id: 'surprised', emoji: '😮', name: 'Удивлён' },
    { id: 'sad', emoji: '😢', name: 'Грустно' },
    { id: 'angry', emoji: '😠', name: 'Злой' },
    { id: 'sleepy', emoji: '😴', name: 'Сонный' },
    { id: 'party', emoji: '🥳', name: 'Праздник' },
    { id: 'fire', emoji: '🔥', name: 'Огонь' },
    { id: 'star', emoji: '⭐', name: 'Звезда' },
  ],
  hands: [
    { id: 'thumbsup', emoji: '👍', name: 'Класс' },
    { id: 'thumbsdown', emoji: '👎', name: 'Не класс' },
    { id: 'ok', emoji: '👌', name: 'ОК' },
    { id: 'clap', emoji: '👏', name: 'Аплодисменты' },
    { id: 'wave', emoji: '👋', name: 'Привет' },
    { id: 'muscle', emoji: '💪', name: 'Сила' },
    { id: 'pray', emoji: '🙏', name: 'Молитва' },
    { id: 'peace', emoji: '✌️', name: 'Мир' },
  ],
  hearts: [
    { id: 'redheart', emoji: '❤️', name: 'Красное сердце' },
    { id: 'heart', emoji: '💖', name: 'Сердце' },
    { id: 'heartbreak', emoji: '💔', name: 'Разбитое' },
    { id: 'kiss', emoji: '💋', name: 'Поцелуй' },
    { id: 'rose', emoji: '🌹', name: 'Роза' },
  ],
  animals: [
    { id: 'dog', emoji: '🐶', name: 'Собака' },
    { id: 'cat', emoji: '🐱', name: 'Кот' },
    { id: 'monkey', emoji: '🐵', name: 'Обезьяна' },
    { id: 'lion', emoji: '🦁', name: 'Лев' },
    { id: 'unicorn', emoji: '🦄', name: 'Единорог' },
    { id: 'penguin', emoji: '🐧', name: 'Пингвин' },
  ],
};

export type StickerPack = keyof typeof STICKER_PACKS;
