const RULES = {
  Test: [
    {
      Name: 'Identifier',
      Regex: /[a-z]+\d/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Keyword',
      Regex: /[a-z]+/,
      Style: {
        Color: '#9CDCFE',
        Bold: false,
        Italic: false,
      },
    },
  ],
  /* ------------------------------------------ */
  /* --------------- JavaScript --------------- */
  /* ------------------------------------------ */
  JavaScript: [
    {
      Name: 'Keyword',
      Regex: /if|else|for|while|function|return|var|let|const|class|import|export/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Identifier',
      Regex: /[a-zA-Z_$][a-zA-Z0-9_$]*/,
      Style: {
        Color: '#9CDCFE',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Number',
      Regex: /[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/,
      Style: {
        Color: '#B5CEA8',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'MultiLineComment',
      Regex: /\/\*([^*]|\*[^/])*(\*\/)?/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'SingleLineComment',
      Regex: /\/\/[^\n]*/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'String',
      Regex: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Operator',
      Regex: /[+\-*/=<>!&|%^~]+/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Punctuation',
      Regex: /[{}(),;.\[\]]/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
  ],

  /* ------------------------------------------ */
  /* ------------------- C ------------------- */
  /* ------------------------------------------ */
  C: [
    {
      Name: 'Keyword',
      Regex: /auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|restrict|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Preprocessor',
      Regex: /#[a-zA-Z_][a-zA-Z0-9_]*/,
      Style: {
        Color: '#C586C0',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Type',
      Regex: /bool|size_t|FILE|NULL/,
      Style: {
        Color: '#4EC9B0',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Identifier',
      Regex: /[a-zA-Z_][a-zA-Z0-9_]*/,
      Style: {
        Color: '#9CDCFE',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Number',
      Regex: /[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?[fFlL]?|0[xX][0-9a-fA-F]+[uUlL]*/,
      Style: {
        Color: '#B5CEA8',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'MultiLineComment',
      Regex: /\/\*([^*]|\*[^/])*(\*\/)?/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'SingleLineComment',
      Regex: /\/\/[^\n]*/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'String',
      Regex: /"([^"\\]|\\.)*"/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Character',
      Regex: /'([^'\\]|\\.)*'/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Operator',
      Regex: /[+\-*/=<>!&|%^~]+|->|\+\+|--|<<|>>/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Punctuation',
      Regex: /[{}(),;.\[\]]/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
  ],

  /* ------------------------------------------ */
  /* ------------------ C++ ------------------ */
  /* ------------------------------------------ */
  'C++': [
    {
      Name: 'Keyword',
      Regex: /alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Preprocessor',
      Regex: /#[a-zA-Z_][a-zA-Z0-9_]*/,
      Style: {
        Color: '#C586C0',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Type',
      Regex: /std|string|vector|map|set|list|queue|stack|pair|shared_ptr|unique_ptr|weak_ptr|size_t|ptrdiff_t/,
      Style: {
        Color: '#4EC9B0',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Identifier',
      Regex: /[a-zA-Z_][a-zA-Z0-9_]*/,
      Style: {
        Color: '#9CDCFE',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Number',
      Regex: /[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?[fFlL]?|0[xX][0-9a-fA-F]+[uUlL]*/,
      Style: {
        Color: '#B5CEA8',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'MultiLineComment',
      Regex: /\/\*([^*]|\*[^/])*(\*\/)?/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'SingleLineComment',
      Regex: /\/\/[^\n]*/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'String',
      Regex: /"([^"\\]|\\.)*"|R"[^(]*\(([^)]|\)[^"])*\)[^"]*"/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Character',
      Regex: /'([^'\\]|\\.)*'/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Operator',
      Regex: /[+\-*/=<>!&|%^~]+|->|\+\+|--|<<|>>|::|&&|\|\||<<=|>>=|==|!=|<=|>=/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Punctuation',
      Regex: /[{}(),;.\[\]]/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
  ],

  /* ------------------------------------------ */
  /* ------------------ Go ------------------- */
  /* ------------------------------------------ */
  Go: [
    {
      Name: 'Keyword',
      Regex: /break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'BuiltinType',
      Regex: /bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr/,
      Style: {
        Color: '#4EC9B0',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'BuiltinFunction',
      Regex: /append|cap|close|complex|copy|delete|imag|len|make|new|panic|print|println|real|recover/,
      Style: {
        Color: '#DCDCAA',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Constant',
      Regex: /true|false|nil|iota/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Identifier',
      Regex: /[a-zA-Z_][a-zA-Z0-9_]*/,
      Style: {
        Color: '#9CDCFE',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Number',
      Regex: /[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?|0[xX][0-9a-fA-F]+|0[0-7]+/,
      Style: {
        Color: '#B5CEA8',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'MultiLineComment',
      Regex: /\/\*([^*]|\*[^/])*(\*\/)?/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'SingleLineComment',
      Regex: /\/\/[^\n]*/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'String',
      Regex: /"([^"\\]|\\.)*"|`[^`]*`/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Character',
      Regex: /'([^'\\]|\\.)*'/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Operator',
      Regex: /[+\-*/=<>!&|%^]+|\+\+|--|<<|>>|<=|>=|==|!=|&&|\|\||<-|:=/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Punctuation',
      Regex: /[{}(),;.\[\]]/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
  ],

  /* ------------------------------------------ */
  /* ----------------- Java ------------------ */
  /* ------------------------------------------ */
  Java: [
    {
      Name: 'Keyword',
      Regex: /abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Constant',
      Regex: /true|false|null/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Type',
      Regex: /String|Integer|Boolean|Double|Float|Long|Short|Byte|Character|Object|Class|System|Math|ArrayList|HashMap|HashSet|List|Map|Set/,
      Style: {
        Color: '#4EC9B0',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Annotation',
      Regex: /@[a-zA-Z_][a-zA-Z0-9_]*/,
      Style: {
        Color: '#DCDCAA',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Identifier',
      Regex: /[a-zA-Z_$][a-zA-Z0-9_$]*/,
      Style: {
        Color: '#9CDCFE',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Number',
      Regex: /[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?[fFdDlL]?|0[xX][0-9a-fA-F]+[lL]?/,
      Style: {
        Color: '#B5CEA8',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'MultiLineComment',
      Regex: /\/\*([^*]|\*[^/])*(\*\/)?/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'SingleLineComment',
      Regex: /\/\/[^\n]*/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'String',
      Regex: /"([^"\\]|\\.)*"/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Character',
      Regex: /'([^'\\]|\\.)*'/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Operator',
      Regex: /[+\-*/=<>!&|%^~]+|\+\+|--|<<|>>|>>>|<=|>=|==|!=|&&|\|\|/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Punctuation',
      Regex: /[{}(),;.\[\]]/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
  ],

  /* ------------------------------------------ */
  /* ---------------- Python ----------------- */
  /* ------------------------------------------ */
  Python: [
    {
      Name: 'Keyword',
      Regex: /and|as|assert|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|not|or|pass|print|raise|return|try|while|with|yield|async|await|nonlocal/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Constant',
      Regex: /True|False|None/,
      Style: {
        Color: '#569CD6',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'BuiltinFunction',
      Regex: /abs|all|any|bin|bool|bytearray|bytes|callable|chr|classmethod|compile|complex|delattr|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip/,
      Style: {
        Color: '#DCDCAA',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Decorator',
      Regex: /@[a-zA-Z_][a-zA-Z0-9_]*/,
      Style: {
        Color: '#DCDCAA',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Identifier',
      Regex: /[a-zA-Z_][a-zA-Z0-9_]*/,
      Style: {
        Color: '#9CDCFE',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Number',
      Regex: /[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?[jJ]?|0[xX][0-9a-fA-F]+|0[oO][0-7]+|0[bB][01]+/,
      Style: {
        Color: '#B5CEA8',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Comment',
      Regex: /#[^\n]*/,
      Style: {
        Color: '#6A9955',
        Bold: false,
        Italic: true,
      },
    },
    {
      Name: 'TripleQuoteString',
      Regex: /"""([^"\\]|\\.)*"""|'''([^'\\]|\\.)*'''/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'String',
      Regex: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'RawString',
      Regex: /r"([^"\\]|\\.)*"|r'([^'\\]|\\.)*'/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'FString',
      Regex: /f"([^"\\]|\\.)*"|f'([^'\\]|\\.)*'/,
      Style: {
        Color: '#CE9178',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Operator',
      Regex: /[+\-*/=<>!&|%^~]+|\*\*|\/\/|<<|>>|<=|>=|==|!=|and|or|not|in|is/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
    {
      Name: 'Punctuation',
      Regex: /[{}(),;.\[\]:]/,
      Style: {
        Color: '#D4D4D4',
        Bold: false,
        Italic: false,
      },
    },
  ],
};

export { RULES };
