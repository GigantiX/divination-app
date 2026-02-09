/**
 * Emoji constants for user avatars
 * Categories: Faces, Animals, Objects
 */

// Face emojis
export const FACE_EMOJIS = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😎', '🤓', '🧐', '🤔', '🤗', '🤭', '🤫', '🤐',
    '😏', '😌', '😴', '🥳', '🤠', '🥸', '😈', '👻',
    '🤖', '👽', '🎃', '🦊', '🐱', '🐶', '🐻', '🐼',
]

// Animal emojis
export const ANIMAL_EMOJIS = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
    '🐗', '🐴', '🦄', '🐝', '🦋', '🐌', '🐞', '🐢',
    '🐍', '🦎', '🦖', '🐙', '🦑', '🦐', '🦀', '🐡',
    '🐠', '🐟', '🐬', '🐳', '🦈', '🐊', '🐅', '🦓',
]

// Object emojis
export const OBJECT_EMOJIS = [
    '⭐', '🌟', '✨', '💫', '🔥', '💧', '🌈', '☀️',
    '🌙', '⚡', '❄️', '🌸', '🌺', '🌻', '🌹', '🍀',
    '🎈', '🎉', '🎊', '🎁', '🎀', '🏆', '🥇', '🎯',
    '🎮', '🎨', '🎭', '🎪', '🎢', '🚀', '🛸', '🌍',
    '💎', '💰', '👑', '🔮', '🎸', '🎹', '🎤', '🎧',
]

// All emojis combined
export const ALL_EMOJIS = [
    ...FACE_EMOJIS,
    ...ANIMAL_EMOJIS,
    ...OBJECT_EMOJIS,
]

/**
 * Get a random emoji from the list
 */
export function getRandomEmoji(): string {
    const index = Math.floor(Math.random() * ALL_EMOJIS.length)
    return ALL_EMOJIS[index]
}

/**
 * Get emojis by category
 */
export function getEmojisByCategory() {
    return {
        faces: FACE_EMOJIS,
        animals: ANIMAL_EMOJIS,
        objects: OBJECT_EMOJIS,
    }
}
