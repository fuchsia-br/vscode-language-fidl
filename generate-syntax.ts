// Copyright 2018 The Fuchsia Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This generates a language definition file because writing it by hand is too hard.

// Format of language definition JSON
const tmSchema = 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json';
type TmCaptures = { [k: string]: { name: string } };
type TmIncludePattern = { include: string };
type TmMatchPattern = {
    name?: string,
    match: string,
    captures?: TmCaptures
};
type TmBlockPattern = {
    name?: string,
    begin: string,
    beginCaptures?: TmCaptures,
    end: string,
    endCaptures?: TmCaptures,
    patterns: TmPattern[]
};
type TmPattern = TmIncludePattern | TmMatchPattern | TmBlockPattern;
type TmLanguage = {
    '$schema': string,
    name: string,
    scopeName: string,
    patterns: TmPattern[],
    repository: {
        [key: string]: { patterns: TmPattern[] }
    },
};


class Pattern {
    readonly re: string;
    readonly names: string[];
    constructor(re: string, names: string[]) {
        this.re = re;
        this.names = names;
        const num_groups = new RegExp(re + '|').exec('')!.length - 1;
        if (num_groups !== this.names.length) {
            throw new Error(`Found ${num_groups} but expected ${this.names.length} groups in ${re}`);
        }
    }

    toString() {
        return this.re;
    }

    assert(s: string) {
        const re = new RegExp(this.re);
        const m = s.match(re);
        if (!m) {
            throw Error(`${JSON.stringify(s)} did not match pattern ${JSON.stringify(this.re)}`);
        }
        if (m[0] !== s) {
            throw Error(`${JSON.stringify(s)} did not fully match pattern ${JSON.stringify(this.re)}, only matched ${JSON.stringify(m[0])}`);
        }
    }

    captures(): TmCaptures {
        const captures: { [k: string]: { name: string } } = {};
        for (let i = 0; i < this.names.length; i++) {
            captures[`${i + 1}`] = { name: this.names[i] };
        }
        return captures;
    }
}

function include(name: string): TmIncludePattern {
    return { include: `#${name}` };
}

function match(name: string, pat: Pattern): TmMatchPattern {
    return {
        name: `${name}.fidl`,
        match: pat.re,
        captures: pat.captures(),
    };
}

function anonMatch(pattern: Pattern | TmPattern): TmPattern {
    if (pattern instanceof Pattern) {
        return {
            match: pattern.re,
            captures: pattern.captures(),
        };
    }
    return pattern;
}

function block(args: { name: string, begin: Pattern, end: Pattern, patterns: Array<Pattern | TmPattern> }): TmBlockPattern {
    return {
        name: `${args.name}.fidl`,
        begin: args.begin.re,
        beginCaptures: args.begin.captures(),
        end: args.end.re,
        endCaptures: args.end.captures(),
        patterns: args.patterns.map(anonMatch),
    };
}


enum Whitespace {
    None, Optional
}

function p(re: string, names?: string[]): Pattern {
    return new Pattern(re, names || []);
}


function _join(pats: Pattern[], prefix: string, separator: string, suffix: string): Pattern {
    const re = pats.map(p => p.toString()).join(separator);
    const names = pats.reduce((ns, p) => [...ns, ...p.names], [] as string[]);
    return p(prefix + re + suffix, names);
}

/**
 * Create a new pattern consisting of adjacent input patterns.
 * @param pats Patterns
 */
function seq(...pats: Pattern[]): Pattern {
    return _join(pats, '', '', '');
}

/**
 * Create a new pattern consisting of adjacent input patterns optionally separated by whitespace.
 * @param pats Patterns
 */
function ws_seq(...pats: Pattern[]): Pattern {
    return _join(pats, '', '\\s*', '');
}

function one_of(...pats: Pattern[]): Pattern {
    return _join(pats, '(?:', '|', ')');
}

function one_of_words(...words: string[]) {
    return word(one_of(...words.map(word => p(word))));
}

function optional(pat: Pattern): Pattern {
    return p(`(?:${pat})?`, pat.names);
}

function word(word: Pattern): Pattern {
    return p(`\\b${word}\\b`, word.names);
}

function named(pat: Pattern, name: string) {
    return p(`(${pat.re})`, [name, ...pat.names]);
}

const NUMERIC_CONSTANT = named(p("-?\\b(?:(?:0(?:x|X)[0-9a-fA-F]*)|(?:(?:[0-9]+\\.?[0-9]*)|(?:\\.[0-9]+))(?:(?:e|E)(?:\\+|-)?[0-9]+)?)\\b"), 'constant.numeric');
const BOOLEAN_CONSTANT = named(one_of_words('true', 'false'), 'constant.language');
const STRING_CONSTANT = named(p('"(?:[^\\"]|\\.)*"'), 'string.quoted.double');
const LITERAL = one_of(NUMERIC_CONSTANT, BOOLEAN_CONSTANT, STRING_CONSTANT);

const IDENTIFIER = p("@?\\b[a-zA-Z_][0-9a-zA-Z_]*\\b");
const QUALIFIED_IDENTIFIER = p(`${IDENTIFIER}(?:\\.${IDENTIFIER})*`);

const NULLABLE = p('([?])?', ['punctuation.nullable']);

function nullable(pat: Pattern): Pattern {
    return seq(pat, NULLABLE);
}

const SIZE = seq(p('[:]'), one_of(NUMERIC_CONSTANT, QUALIFIED_IDENTIFIER));

function sized(pat: Pattern, size_required: boolean) {
    let size = SIZE;
    if (!size_required) {
        size = optional(size);
    }
    return seq(pat, size);
}

function keyword(keyword: string, name: string = 'keyword.control') {
    return word(named(p(keyword), name));
}

function separator(sep: string) {
    return named(p(sep), 'punctuation.separator');
}

const PRIMITIVE_TYPE = p("\\b(bool|float32|float64|int8|int16|int32|int64|uint8|uint16|uint32|uint64)\\b", ['storage.type.basic']);
const HANDLE_TYPE = named(nullable(p("\\bhandle\\b(?:<(?:process|thread|vmo|event|port|log|socket|eventpair|job|vmar|fifo|timer|channel|interrupt)>)?")), 'storage.type.basic');
const STRING_TYPE = named(nullable(sized(p(`\\bstring\\b`), false)), 'storage.type.basic');
const REQUEST_TYPE = named(nullable(seq(keyword('request'), p('<'), named(QUALIFIED_IDENTIFIER, 'entity.type.name'), p('>'))), 'storage.type.basic');
const BASIC_TYPE = one_of(PRIMITIVE_TYPE, HANDLE_TYPE, STRING_TYPE, REQUEST_TYPE);

const EOL = p('(;)', ['punctuation.terminator']);
const LIBRARY_NAME = named(QUALIFIED_IDENTIFIER, 'entity.name.type');
const LOCAL_TYPE = named(IDENTIFIER, 'entity.name.type');
const NULLABLE_CUSTOM_TYPE = named(nullable(QUALIFIED_IDENTIFIER), 'entity.name.type');
const VARIABLE = named(IDENTIFIER, 'variable');

const LOOKAHEAD_IDENTIFIER = p('(?=[a-zA-Z_@])');


// Checks

QUALIFIED_IDENTIFIER.assert('foo');
QUALIFIED_IDENTIFIER.assert('foo_bar');
QUALIFIED_IDENTIFIER.assert('foo.bar.baz');

STRING_TYPE.assert('string');
STRING_TYPE.assert('string?');
STRING_TYPE.assert('string:2');
STRING_TYPE.assert('string:strings_size');
STRING_TYPE.assert('string:2?');
STRING_TYPE.assert('string:strings_size?');

NUMERIC_CONSTANT.assert('-42');



// TODO: support attributes
const tmLanguage: TmLanguage = {
    '$schema': tmSchema,
    name: "FIDL",
    scopeName: "source.fidl",
    patterns: [
        include('comments'),

        // Library declaration
        match('meta.library', ws_seq(keyword('library'), LIBRARY_NAME, EOL)),

        // Variations of using
        match('meta.library', ws_seq(keyword('using'), LIBRARY_NAME, EOL)),
        match('meta.library', ws_seq(keyword('using'), LIBRARY_NAME, keyword('as'), LOCAL_TYPE, EOL)),
        match('meta.library', ws_seq(keyword('using'), LOCAL_TYPE, separator('='), PRIMITIVE_TYPE, EOL)),

        // Const declaration
        // TODO: allow string constants
        match('meta.const', ws_seq(keyword('const'), PRIMITIVE_TYPE, named(IDENTIFIER, 'variable.constant'), separator('='),
        one_of(QUALIFIED_IDENTIFIER, NUMERIC_CONSTANT, BOOLEAN_CONSTANT), EOL)),

        // Interfaces
        // TODO: inheritance
        block({
            name: 'meta.interface-block',
            begin: ws_seq(keyword('interface'), LOCAL_TYPE, p('{')),
            end: p("}"),
            patterns: [include('method'), include('comments')],
        }),

        // Enums
        block({
            name: 'meta.enum-block',
            // TODO: need to have a NUMERIC_TYPE
            begin: ws_seq(keyword('enum'), LOCAL_TYPE, optional(ws_seq(separator(':'), PRIMITIVE_TYPE)), p('{')),
            end: p("}"),
            patterns: [include('enum-member'), include('comments')]
        }),

        // Struct
        block({
            name: 'meta.struct-block',
            begin: ws_seq(keyword('struct'), LOCAL_TYPE, p('{')),
            end: p("}"),
            patterns: [include('struct-member'), include('comments')],
        }),

        // Union
        block({
            name: 'meta.union-block',
            begin: ws_seq(keyword('union'), LOCAL_TYPE, p('{')),
            end: p("}"),
            patterns: [include('union-member'), include('comments')],
        })
    ],
    repository: {
        "comments": {
            patterns: [
                block({
                    name: 'comment.block',
                    begin: p("/\\*"),
                    end: p("\\*/"),
                    patterns: [],
                }),
                match('invalid.illegal.stray-comment-end', p("\\*/.*\\n")),
                match('comment.line.double-slash', p('//.*\\n')),
            ]
        },
        "method": {
            patterns: [
                block({
                    name: 'meta.method',
                    begin: ws_seq(NUMERIC_CONSTANT, separator(':'), named(IDENTIFIER, 'entity.name.function')),
                    end: EOL,
                    patterns: [
                        include('method-arguments'),
                        separator('->'),
                    ],
                }),
                block({
                    name: 'meta.method.event',
                    begin: ws_seq(NUMERIC_CONSTANT, separator(':'), separator('->'), named(IDENTIFIER, 'entity.name.function'), p('[(]')),
                    end: ws_seq(p('[)]'), EOL),
                    patterns: [
                        include('method-argument'),
                    ],
                }),]
        },
        "method-arguments": {
            patterns: [
                block({
                    name: 'meta.method.arguments',
                    begin: p("\\("),
                    end: p("\\)"),
                    patterns: [
                        include('method-argument')
                    ]
                })
            ]
        },
        "method-argument": {
            patterns: [
                block({
                    name: "meta.method.argument",
                    begin: LOOKAHEAD_IDENTIFIER,
                    end: ws_seq(named(IDENTIFIER, 'variable.name'), p('(?:(?:,)|(?=\\)))')),
                    patterns: [
                        include('type'),
                        named(IDENTIFIER, 'variable.parameter'),
                    ]
                })
            ]
        },
        "enum-member": {
            patterns: [
                match('meta.enum.member', ws_seq(VARIABLE, separator('='), NUMERIC_CONSTANT, EOL))
            ]
        },
        "struct-member": {
            patterns: [
                match('meta.struct.member', ws_seq(BASIC_TYPE, VARIABLE, EOL)),
                match('meta.struct.member', ws_seq(BASIC_TYPE, VARIABLE, separator('='), LITERAL, EOL)),
                match('meta.struct.member', ws_seq(NULLABLE_CUSTOM_TYPE, VARIABLE, EOL)),
                block({
                    name: 'meta.struct.member',
                    begin: LOOKAHEAD_IDENTIFIER,
                    end: ws_seq(VARIABLE, EOL),
                    patterns: [include('type')]
                }),
            ]
        },
        "union-member": {
            patterns: [
                match('meta.union.member', ws_seq(BASIC_TYPE, VARIABLE, EOL)),
                match('meta.union.member', ws_seq(NULLABLE_CUSTOM_TYPE, VARIABLE, EOL)),
                block({
                    name: 'meta.union.member',
                    begin: LOOKAHEAD_IDENTIFIER,
                    end: ws_seq(VARIABLE, EOL),
                    patterns: [include('type')]
                }),
            ]
        },
        "type": {
            patterns: [
                include('array-type'),
                include('vector-type'),
                anonMatch(BASIC_TYPE),
            ]
        },
        "array-type": {
            patterns: [
                block({
                    name: "storage.type.array",
                    begin: seq(keyword('array', 'storage.type.array'), p('<')),
                    end: seq(p(">"), SIZE),
                    patterns: [
                        include('type')
                    ]
                }),
            ]
        },
        "vector-type": {
            patterns: [
                block({
                    name: "storage.type.vector",
                    begin: seq(keyword('vector', 'storage.type.array'), p('<')),
                    end: seq(p(">"), optional(SIZE), NULLABLE),
                    patterns: [
                        include('type'),
                    ]
                }),
            ]
        },
    },
};

console.log(JSON.stringify(tmLanguage, null, '    '));
