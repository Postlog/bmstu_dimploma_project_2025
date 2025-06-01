const COLORS = {
    // Standard colors
    'black': '\x1b[30m',
    'red': '\x1b[31m',
    'green': '\x1b[32m',
    'yellow': '\x1b[33m',
    'blue': '\x1b[34m',
    'magenta': '\x1b[35m',
    'cyan': '\x1b[36m',
    'white': '\x1b[37m',
    'brown': '\x1b[33m',
    'gray': '\x1b[90m',
    'grey': '\x1b[90m',
    'purple': '\x1b[35m',
    'orange': '\x1b[33m',
    'pink': '\x1b[95m',
    'violet': '\x1b[35m',
    'indigo': '\x1b[34m',

    // Bright variants
    'brightBlack': '\x1b[90m',
    'brightRed': '\x1b[91m',
    'brightGreen': '\x1b[92m',
    'brightYellow': '\x1b[93m',
    'brightBlue': '\x1b[94m',
    'brightMagenta': '\x1b[95m',
    'brightCyan': '\x1b[96m',
    'brightWhite': '\x1b[97m',

    // Aliases
    'light': '\x1b[37m',
    'dark': '\x1b[30m',
    'error': '\x1b[31m',
    'success': '\x1b[32m',
    'warning': '\x1b[33m',
    'info': '\x1b[36m',
};

const RESET = '\x1b[0m';

function highlightWord(word, style) {
    // ANSI color codes for terminal

    // Get color code or default to white if style not found
    const colorCode = COLORS[style] || COLORS['white'];

    // Return word wrapped in color codes
    return `${colorCode}${word}${RESET}`;
}

export { highlightWord };
