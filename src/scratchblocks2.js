/*
 * scratchblocks2
 * http://github.com/blob8108/scratchblocks2
 *
 * Copyright 2013, Tim Radvan
 * @license MIT
 * http://opensource.org/licenses/MIT
 */

/*
 * The following classes are used:
 *
 * Categories:
 *
 *     sb2
 *     inline-block
 *     script
 *     empty
 *
 * Comments:
 *
 *     comment
 *     attached
 *     to-hat
 *     to-reporter
 *
 * Shapes:
 *
 *     hat                |- Blocks  (These come from the database, the rest
 *     cap                |           come from the parsed code.)
 *
 *     stack              |
 *     embedded           |- Blocks
 *     boolean            |
 *
 *     reporter           |- This one's kinda weird.
 *
 *     string             |
 *     dropdown           |
 *     number             |
 *     number-dropdown    |- Inserts
 *     color              |
 *     define-hat         |
 *     outline            |
 *
 *     cstart |
 *     celse  |- Parser directives. (Used in the database to tell the parser
 *     cend   |                      to create the C blocks.)
 *
 *     cmouth |
 *     cwrap  |- Only used in the CSS code
 *     capend |
 *
 * Categories (colour):
 *
 *     motion
 *     looks
 *     sound
 *     pen
 *     variables
 *     list
 *
 *     events
 *     control
 *     sensing
 *     operators
 *
 *     custom
 *     custom-arg
 *     extension -- Sensor blocks
 *     grey -- for the ". . ." ellipsis block
 *
 *     obsolete
 *
 */

String.prototype.startsWith = function(prefix) {
    return this.indexOf(prefix) === 0;
};

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.contains = function(substring) {
    return this.indexOf(substring) !== -1;
};


var scratchblocks2 = function ($) {
    "use strict";

    function assert(bool) {
        if (!bool) throw "Assertion failed!";
    }

    var sb2 = {}; // The module we export.



    /*** Database ***/

    // First, initialise the blocks database.

    /*
     * We need to store info such as category and shape for each block.
     *
     * This can be indexed in two ways:
     *
     *  - by the text input to the parser, minus the insert parts
     *
     *      (eg. "say [Hi!] for (3) secs" is minifed to "sayforsecs", which we
     *           then look up in the database
     *
     *  - by a language code & blockid
     *
     *      (eg. "de" & "say _ for _ secs")
     *
     *      This is used by external add-ons for translating between languages,
     *      and won't get used internally.
     *
     * Some definitions:
     *
     *  - spec: The spec for the block, with underscores representing inserts.
     *          May be translated.
     *          eg. "sage _ für _ Sek."
     *
     *  - blockid: the English spec.
     *          eg. "say _ for _ secs"
     *
     */

    var strings = sb2.strings = {
        aliases: {},

        define: [],
        ignorelt: [],
        math: [],
        osis: [],
    };

    var languages = sb2.languages = {};
    var block_info_by_id = {};
    var block_by_text = {};
    var blockids = []; // Used by load_language

    // Build the English blocks.

    var english = {
        code: "en",

        blocks: [], // These are defined just below

        aliases: {
            "turn left _ degrees": "turn @arrow-ccw _ degrees",
            "turn ccw _ degrees": "turn @arrow-ccw _ degrees",
            "turn right _ degrees": "turn @arrow-cw _ degrees",
            "turn cw _ degrees": "turn @arrow-cw _ degrees",
            "when gf clicked": "when @green-flag clicked",
            "when flag clicked": "when @green-flag clicked",
            "when green flag clicked": "when @green-flag clicked",
        },

        define: ["define"],

        // For ignoring the lt sign in the "when distance < _" block
        ignorelt: ["when distance"],

        // Valid arguments to "of" dropdown, for resolving ambiguous situations
        math: ["abs", "floor", "ceiling", "sqrt", "sin", "cos", "tan", "asin",
               "acos", "atan", "ln", "log", "e ^", "10 ^"],

        // For detecting the "stop" cap / stack block
        osis: ["other scripts in sprite"],
    };

    var english_blocks = [
        ["motion"],

        ["move _ steps", []],
        ["turn @arrow-ccw _ degrees", []],
        ["turn @arrow-cw _ degrees", []],

        ["point in direction _", []],
        ["point towards _", []],

        ["go to x:_ y:_", []],
        ["go to _", []],
        ["glide _ secs to x:_ y:_", []],

        ["change x by _", []],
        ["set x to _", []],
        ["change y by _", []],
        ["set y to _", []],

        ["if on edge, bounce", []],

        ["set rotation style _", []],

        ["x position", []],
        ["y position", []],
        ["direction", []],



        ["looks"],

        ["say _ for _ secs", []],
        ["say _", []],
        ["think _ for _ secs", []],
        ["think _", []],

        ["show", []],
        ["hide", []],

        ["switch costume to _", []],
        ["next costume", []],
        ["switch backdrop to _", []],

        ["change _ effect by _", []],
        ["set _ effect to _", []],
        ["clear graphic effects", []],

        ["change size by _", []],
        ["set size to _%", []],

        ["go to front", []],
        ["go back _ layers", []],

        ["costume #", []],
        ["backdrop name", []],
        ["size", []],

        // Stage-specific

        ["switch backdrop to _ and wait", []],
        ["next backdrop", []],

        ["backdrop #", []],

        // Scratch 1.4

        ["switch to costume _", []],

        ["switch to background _", []],
        ["next background", []],
        ["background #", []],



        ["sound"],

        ["play sound _", []],
        ["play sound _ until done", []],
        ["stop all sounds", []],

        ["play drum _ for _ beats", []],
        ["rest for _ beats", []],

        ["play note _ for _ beats", []],
        ["set instrument to _", []],

        ["change volume by _", []],
        ["set volume to _%", []],
        ["volume", []],

        ["change tempo by _", []],
        ["set tempo to _ bpm", []],
        ["tempo", []],



        ["pen"],

        ["clear", []],

        ["stamp", []],

        ["pen down", []],
        ["pen up", []],

        ["set pen color to _", []],
        ["change pen color by _", []],
        ["set pen color to _", []],

        ["change pen shade by _", []],
        ["set pen shade to _", []],

        ["change pen size by _", []],
        ["set pen size to _", []],



        ["variables"],

        ["set _ to _", []],
        ["change _ by _", []],
        ["show variable _", []],
        ["hide variable _", []],



        ["list"],

        ["add _ to _", []],

        ["delete _ of _", []],
        ["insert _ at _ of _", []],
        ["replace item _ of _ with _", []],

        ["item _ of _", []],
        ["length of _", []],
        ["_ contains _", []],

        ["show list _", []],
        ["hide list _", []],



        ["events"],

        ["when @green-flag clicked", ["hat"]],
        ["when _ key pressed", ["hat"]],
        ["when this sprite clicked", ["hat"]],
        ["when backdrop switches to _", ["hat"]],

        ["when _ > _", ["hat"]],

        ["when I receive _", ["hat"]],
        ["broadcast _", []],
        ["broadcast _ and wait", []],



        ["control"],

        ["wait _ secs", []],

        ["repeat _", ["cstart"]],
        ["forever", ["cstart", "cap"]],
        ["if _ then", ["cstart"]],
        ["else", ["celse"]],
        ["end", ["cend"]],
        ["wait until _", []],
        ["repeat until _", ["cstart"]],

        ["stop _", ["cap"]],

        ["when I start as a clone", ["hat"]],
        ["create clone of _", []],
        ["delete this clone", ["cap"]],

        // Scratch 1.4

        ["if _", ["cstart"]],
        ["forever if _", ["cstart", "cap"]],
        ["stop script", ["cap"]],
        ["stop all", ["cap"]],



        ["sensing"],

        ["touching _?", []],
        ["touching color _?", []],
        ["color _ is touching _?", []],
        ["distance to _", []],

        ["ask _ and wait", []],
        ["answer", []],

        ["key _ pressed?", []],
        ["mouse down?", []],
        ["mouse x", []],
        ["mouse y", []],

        ["loudness", []],

        ["video _ on _", []],
        ["turn video _", []],
        ["set video transparency to _%", []],

        ["timer", []],
        ["reset timer", []],

        ["_ of _", []],

        ["current _", []],
        ["days since 2000", []],
        ["username", []],

        // Scratch 1.4

        ["loud?", []],



        ["operators"],

        ["_ + _", []],
        ["_ - _", []],
        ["_ * _", []],
        ["_ / _", []],

        ["pick random _ to _", []],

        ["_ < _", []],
        ["_ = _", []],
        ["_ > _", []],

        ["_ and _", []],
        ["_ or _", []],
        ["not _", []],

        ["join _ _", []],
        ["letter _ of _", []],
        ["length of _", []],

        ["_ mod _", []],
        ["round _", []],

        ["_ of _", []],



        ["extension"],

        ["when _", ["hat"]],
        ["sensor _?", []],
        ["_ sensor value", []],

        ["turn motor on for _ secs", []],
        ["turn motor on", []],
        ["turn motor off", []],
        ["set motor power _", []],
        ["set motor direction _", []],

        ["when distance < _", ["hat"]],
        ["when tilt = _", ["hat"]],
        ["distance", []],
        ["tilt", []],

        // Scratch 1.4

        ["motor on", []],
        ["motor off", []],
        ["motor on for _ seconds", []],
        ["motor power _", []],
        ["motor direction _", []],



        ["grey"],

        ["…", []],
        ["...", []],
    ];

    // The blockids are the same as english block text, so we build the blockid
    // list at the same time.

    var category = null;
    for (var i=0; i<english_blocks.length; i++) {
        if (english_blocks[i].length === 1) { // [category]
            category = english_blocks[i][0];
        } else {                              // [block id, [list of flags]]
            var block_and_flags = english_blocks[i],
                spec = block_and_flags[0], flags = block_and_flags[1];
            english.blocks.push(spec);

            blockids.push(spec); // Other languages will just provide a list of
                                 // translations, which is matched up with this
                                 // list.

            // Now store shape/category info.
            var info = {
                blockid: spec,
                category: category,
            };

            while (flags.length) {
                var flag = flags.pop();
                switch (flag) {
                    case "hat":
                    case "cap":
                        info.shape = flag;
                        break;
                    default:
                        assert(!info.flag);
                        info.flag = flag;
                }
            }

            var image_match = /@([-A-z]+)/.exec(spec);
            if (image_match) {
                info.image_replacement = image_match[1];
            }

            block_info_by_id[spec] = info;
        }
    }

    // Built english, now add it.

    load_language(english);

    function load_language(language) {
        var iso_code = language.code;
        delete language.code;

        // convert blocks list to a dict.
        var block_spec_by_id = {};
        for (var i=0; i<language.blocks.length; i++) {
            var spec = language.blocks[i],
                blockid = blockids[i];
            spec = spec.replace(/@[-A-z]+/, "@"); // remove images
            block_spec_by_id[blockid] = spec;

            // Add block to the text lookup dict.
            var minispec = minify_spec(spec);
            if (minispec || spec === "_") block_by_text[minispec] = {
                blockid: blockid,
                lang: iso_code,
            };
        }
        language.blocks = block_spec_by_id;

        // add aliases (for images)
        for (var text in language.aliases) {
            strings.aliases[text] = language.aliases[text];

            // Add alias to the text lookup dict.
            block_by_text[minify_spec(text)] = {
                blockid: language.aliases[text],
                lang: iso_code,
            };
        }

        // add stuff to strings
        for (var key in strings) {
            if (strings[key].constructor === Array) {
                for (i=0; i<language[key].length; i++) {
                    strings[key].push(minify(language[key][i]));
                }
            }
        }

        languages[iso_code] = language;
    }

    sb2.load_language = load_language;

    // Hacks for certain blocks.

    block_info_by_id["_ of _"].hack = function (info, args) {
        // Operators if math function, otherwise sensing "attribute of" block
        if (!args.length) return;
        var func = minify(strip_brackets(args[0]).replace(/ v$/, ""));
        info.category = ($.inArray(func, strings.math) > -1) ? "operators"
                                                             : "sensing";
    }

    block_info_by_id["length of _"].hack = function (info, args) {
        // List block if dropdown, otherwise operators
        if (!args.length) return;
        info.category = (/^\[.* v\]$/.test(args[0])) ? "list"
                                                     : "operators";
    }

    block_info_by_id["stop _"].hack = function (info, args) {
        // Cap block unless argument is "other scripts in sprite"
        if (!args.length) return;
        var what = minify(strip_brackets(args[0]).replace(/ v$/, ""));
        info.shape = ($.inArray(what, strings.osis) > -1) ? null
                                                          : "cap";
    }

    // Define function for getting block info by text.

    function find_block(spec, args) {
        var minitext = minify_spec(spec);
        if (minitext in block_by_text) {
            var lang_and_id = block_by_text[minitext];
            var blockid = lang_and_id.blockid;
            var info = clone(block_info_by_id[blockid]);
            if (info.image_replacement) {
                info.spec = languages[lang_and_id.lang].blocks[blockid];
            } else {
                if (minitext === "...") spec = "…";
                info.spec = spec;
            }
            if (info.hack) info.hack(info, args);
            return info;
        }
        if (spec.replace(/ /g, "") === "...") return find_block("...");
        if (spec.replace(/[ ▶◀▸◂]/g, "") === "_")
                return {blockid: "_", spec: spec, category: "grey"};
    }

    // Utility function that copies a dictionary.

    function clone(dict) {
        var result = {};
        for (var key in dict) {
            result[key] = dict[key];
        }
        return result;
    }

    // Text minifying functions normalise block text before lookups.

    function remove_diacritics(text) {
        text = text.replace("ß", "ss");
        var map = diacritics_removal_map;
        for (var i = 0; i < map.length; i++) {
            text = text.replace(map[i].letters, map[i].base);
        }
        return text;
    }

    function minify(text) {
        var minitext = text.replace(/[ \t.,%?:▶◀▸◂]/g, "").toLowerCase();
        if (window.diacritics_removal_map) minitext = remove_diacritics(minitext);
        if (!minitext && text.replace(" ", "") === "...") minitext = "...";
        return minitext;
    }

    function minify_spec(text) {
        return minify(text).replace(/_/g, "");
    }



    /*** Parse block ***/

    var BRACKETS = "([<{)]>}";

    // Various bracket-related utilities...

    function is_open_bracket(chr) {
        var bracket_index = BRACKETS.indexOf(chr);
        return (-1 < bracket_index && bracket_index < 4);
    }

    function is_close_bracket(chr) {
        return (3 < BRACKETS.indexOf(chr));
    }

    function get_matching_bracket(chr) {
        return BRACKETS[BRACKETS.indexOf(chr) + 4];
    }

    // Strip one level of brackets from around a piece.

    function strip_brackets(code) {
        if (is_open_bracket(code[0])) {
            var bracket = code[0];
            if (code[code.length - 1] === get_matching_bracket(bracket)) {
                code = code.substr(0, code.length - 1);
            }
            code = code.substr(1);
        }
        return code;
    }

    // Split the block code into text and inserts based on brackets.

    function split_into_pieces(code) {
        var pieces = [],
            piece = "",
            matching_bracket = "",
            nesting = [];

        for (var i=0; i<code.length; i++) {
            var chr = code[i];

            if (nesting.length > 0) {
                piece += chr;
                if (is_open_bracket(chr) && !is_lt_gt(code, i) &&
                        nesting[nesting.length - 1] !== "[") {
                    nesting.push(chr);
                    matching_bracket = get_matching_bracket(chr);
                } else if (chr === matching_bracket && !is_lt_gt(code, i)) {
                    nesting.pop();
                    if (nesting.length === 0) {
                        pieces.push(piece);
                        piece = "";
                    } else {
                        matching_bracket = get_matching_bracket(
                            nesting[nesting.length - 1]
                        );
                    }
                }
            } else {
                if (is_open_bracket(chr) && !is_lt_gt(code, i)) {
                    nesting.push(chr);
                    matching_bracket = get_matching_bracket(chr);

                    if (piece) pieces.push(piece);
                    piece = "";
                }
                piece += chr;
            }
        }
        if (piece) pieces.push(piece); // last piece
        return pieces;
    }

    // A piece is a block if it starts with a bracket.

    function is_block(piece) {
        return piece.length > 1 && is_open_bracket(piece[0]);
    }

    // Take block code and return block info object.

    function parse_block(code, mode) {
        // strip brackets
        var bracket = code.charAt(0);
        code = strip_brackets(code);

        // define hat?
        for (var i=0; i<strings.define.length; i++) {;;
            var define_text = strings.define[i];
            if (code.startsWith(define_text)) {
                var define_hat = code.slice(define_text.length);
                if (!define_hat || define_hat.startsWith(" ")) {
                    return {
                        shape: "define-hat",
                        category: "custom",
                        pieces: [define_text,
                                 parse_block(define_hat, "define-hat")],
                    }
                }
            }
        }

        // split into text segments and inserts
        var pieces = split_into_pieces(code);

        // get shape
        var shape, isablock;
        if (pieces.length > 1 && bracket !== "[") {
            shape = get_block_shape(bracket);
            isablock = true;
        } else {
            shape = get_insert_shape(bracket, code);
            isablock = $.inArray(shape, ["reporter", "boolean", "stack"]) > -1;
            if (shape.contains("dropdown")) {
                code = code.substr(0, code.length - 2);
            }
        }

        // insert?
        if (!isablock) {
            return {
                shape: shape,
                pieces: [code],
            };
        }

        // trim ends
        if (pieces.length) {
            pieces[0] = pieces[0].trimLeft(" ");
            pieces[pieces.length-1] = pieces[pieces.length-1].trimRight(" ");
        }

        // filter out block text & args
        var spec = "";
        var args = [];
        for (var i=0; i<pieces.length; i++) {
            var piece = pieces[i];
            if (is_block(piece)) {
                args.push(piece);
                spec += "_";
            } else {
                spec += piece;
            }
        }

        // override attrs?
        var overrides;
        var match = /^(.*)::([A-z\- ]*)$/.exec(spec);
        if (match) {
            spec = match[1].trimRight();
            overrides = match[2].trim().split(" ");
            while (overrides[overrides.length - 1] === "") overrides.pop();
        }

        // get category & related block info
        if (spec) var info = find_block(spec, args);

        if (info) {
            if (!info.shape) info.shape = shape;
            if (info.flag === "cend") info.spec = "";
        } else {
            // unknown block
            info = {
                shape: shape,
                category: (shape === "reporter") ? "variables" : "obsolete",
                spec: spec,
                args: args,
                overrides: overrides,
            };

            if (mode === "define-hat") {
                if (shape === "stack") {
                    info.shape = "outline";
                    if (info.category === "obsolete") info.category = "";
                } else {
                    info.category = "custom-arg";
                }
            }
        }

        if (overrides) {
            if (overrides.length > 0) info.category = overrides[0];
            if (overrides.length > 1) {
                if ($.inArray(overrides[1], ["cstart", "celse",
                                             "cend"]) > -1) {
                    info.flag = overrides[1];
                } else {
                    info.shape = overrides[1];
                }
            }
        }

        // rebuild pieces in case text has changed
        var pieces = [];
        var text_parts = info.spec.split(/([_@▶◀▸◂])/);
        for (var i=0; i<text_parts.length; i++) {
            var part = text_parts[i];
            if (part === "_") {
                var arg = args.shift();
                part = (arg === undefined) ? "_" : parse_block(arg, mode);
                if (info.blockid === "_") {
                    part.is_ringed = true;
                }
                /* If there are no args left, then the underscore must really
                 * be an underscore and not an insert.
                 *
                 * This only becomes a problem if the code contains
                 * underscores followed by inserts.
                 */
            }
            if (part) pieces.push(part);
        }
        delete info.spec;
        delete info.args;
        info.pieces = pieces;
        return info;
    }

    // Return block info object for line, including comment.

    function parse_line(line) {
        line = line.trim();

        // comments
        var comment;

        var i = line.indexOf("//");
        if (i !== -1 && line[i-1] !== ":") {
            comment = line.slice(i+2);
            line    = line.slice(0, i).trim();

            // free-floating comment?
            if (!line.trim()) return {blockid: "//", comment: comment,
                                      pieces: []};
        }

        var info = parse_block(line);

        // category hack -- TODO deprecated
        if (comment && info.shape !== "define-hat") {
            var match = /(^| )category=([a-z]+)($| )/.exec(comment);
            if (match) {
                info.category = match[2];
                comment = comment.replace(match[0], " ").trim();
            }
        }

        if (comment !== undefined && !comment.trim()) comment = undefined;
        info.comment = comment;
        return info;
    }

    // Functions to get shape from code.

    function get_block_shape(bracket) {
        switch (bracket) {
            case "(": return "embedded";
            case "<": return "boolean";
            case "{": default: return "stack";
        }
    }

    function get_insert_shape(bracket, code) {
        switch (bracket) {
            case "(":
                if (/^(-?[0-9.]+( v)?)?$/i.test(code)) {
                    if (code.endsWith(" v")) {
                        return "number-dropdown";
                    } else {
                        return "number";
                    }
                } else if (code.endsWith(" v")) {
                    // rounded dropdowns (not actually number)
                    return "number-dropdown";
                } else {
                    // reporter (or embedded! TODO remove this comment)
                    return "reporter";
                }
            case "[":
                if (/^#[A-Fa-f0-9]{3,6}$/.test(code)) {
                    return "color";
                } else {
                    if (code.endsWith(" v")) {
                        return "dropdown";
                    } else {
                        return "string";
                    }
                }
            case "<":
                return "boolean";
            default:
                return "stack";
        }
    }

    function get_custom_arg_shape(bracket) {
        switch (bracket) {
            case "<": return "boolean";
            default:  return "reporter";
        }
    }

    // Check whether angle brackets are supposed to be lt/gt blocks.

    /*
     * We need a way to parse eg.
     *
     *      if <[6] < [3]> then
     *
     *  Obviously the central "<" should be ignored by split_into_pieces.
     *
     *  In addition, we need to handle blocks containing a lt symbol:
     *
     *      when distance < (30)
     *
     *  We do this by matching against `strings.ignorelt`.
     */

    // Returns true if it's lt/gt, false if it's an open/close bracket.

    function is_lt_gt(code, index) {
        var chr, i;

        if ((code[index] !== "<" && code[index] !== ">") ||
                index === code.length || index === 0) {
            return false;
        }

        // hat block containing lt symbol?
        for (var i=0; i<strings.ignorelt.length; i++) {
            var when_dist = strings.ignorelt[i];
            if (minify(code.substr(0, index)).startsWith(when_dist)) {
                return true; // don't parse as a boolean
            }
        }

        // look for open brackets ahead
        for (i = index + 1; i < code.length; i++) {
            chr = code[i];
            if (is_open_bracket(chr)) {
                break; // might be an innocuous lt/gt!
            }
            if (chr !== " ") {
                return false; // something else => it's a bracket
            }
        }

        // look for close brackets behind
        for (i = index - 1; i > -1; i--) {
            chr = code[i];
            if (is_close_bracket(chr)) {
                break; // must be an innocuous lt/gt!
            }
            if (chr !== " ") {
                return false; // something else => it's a bracket
            }
        }

        // we found a close bracket behind and an open bracket ahead, eg:
        //      ) < [
        return true; // it's an lt/gt block!
    }



    /*** Parse scripts ***/

    // Take scratchblocks text and turn it into useful objects.

    function parse_scripts(code) {
        var scripts = [];
        var nesting = [[]];
        var lines = code.trim().split("\n");

        function new_script() {
            if (nesting[0].length) {
                while (nesting.length > 1) {
                    do_cend({blockid: "end", category: "control",
                            flag: "cend", shape: "stack", pieces: []});
                }
                scripts.push(nesting[0]);
                nesting = [[]];
            }
            current_script = nesting[nesting.length - 1];
        }

        function do_cend(info) {
            // pop the innermost script off the stack
            var cmouth = nesting.pop(); // cmouth contents
            if (cmouth.length && cmouth[cmouth.length - 1].shape == "cap") {
                // last block is a cap block
                info.flag += " capend";
            }
            var cwrap = nesting.pop();
            info.category = cwrap[0].category; // category of c block
            cwrap.push(info);
        }

        for (i=0; i<lines.length; i++) {
            var line = lines[i].trim();

            if (!line) {
                if (nesting.length <= 1) new_script();
                continue;
            }

            var current_script = nesting[nesting.length - 1];

            var info = parse_line(lines[i]);

            if (!info.pieces.length && info.comment !== undefined) {
                // TODO multi-line comments
                new_script();
                current_script.push(info);
                new_script();
                continue;
            }

            if (!info.category) { // cheap test for inserts.
                // Put free-floating inserts in their own stack block.
                info = {blockid: "_", category: "obsolete", shape: "stack",
                        pieces: [info]};
            }

            switch (info.flag || info.shape) {
                case "hat":
                case "define-hat":
                    new_script();
                    current_script.push(info);
                    break;

                case "cap":
                    current_script.push(info);
                    if (nesting.length <= 1) new_script();
                    break;

                case "cstart":
                    var cwrap = {
                        type: "cwrap",
                        shape: info.shape,
                        contents: [info],
                    };
                    info.shape = "stack";
                    current_script.push(cwrap);
                    nesting.push(cwrap.contents);
                    var cmouth = {type: "cmouth", contents: [],
                                  category: info.category};
                    cwrap.contents.push(cmouth);
                    nesting.push(cmouth.contents);
                    break;

                case "celse":
                    if (nesting.length <= 1) {
                        current_script.push(info);
                        break;
                    }
                    nesting.pop(); // old cmouth contents
                    var cwrap = nesting[nesting.length - 1]; // cwrap contents
                    info.category = cwrap[0].category; // category of c block
                    cwrap.push(info);
                    var cmouth = {type: "cmouth", contents: [],
                                  category: cwrap[0].category};
                    cwrap.push(cmouth);
                    nesting.push(cmouth.contents);
                    break;

                case "cend":
                    if (nesting.length <= 1) {
                        current_script.push(info);
                        break;
                    }
                    do_cend(info);
                    break;

                case "reporter":
                case "boolean":
                case "embedded":
                    // put free-floating reporters in a new script
                    new_script();
                    current_script.push(info);
                    new_script();
                    break;

                default:
                    current_script.push(info);
            }
        }
        new_script();
        return scripts;
    }

    sb2.parse_scripts = parse_scripts;



    /*** Render ***/

    /* Render all matching elements in page to shiny scratch blocks.
     * Accepts a CSS-style selector as an argument.
     *
     *  scratchblocks2.parse("pre.blocks");
     *
     * (This should really be called "render_all"...)
     */
    sb2.parse = function (selector, options) {
        selector = selector || "pre.blocks";
        options = options || {
            inline: false,
        }

        // find elements
        $(selector).each(function (i, el) {
            var $el = $(el),
                $container = $('<div>'),
                code,
                scripts,
                html = $el.html();

            html = html.replace(/<br>\s?|\n|\r\n|\r/ig, '\n');
            code = $('<pre>' + html + '</pre>').text();
            if (options.inline) {
                code = code.replace('\n', '');
            }

            var scripts = parse_scripts(code);

            $el.text("");
            $el.append($container);
            $container.addClass("sb2");
            if (options.inline) {
                $container.addClass("inline-block");
            }
            for (var i=0; i<scripts.length; i++) {
                var $script = render_stack(scripts[i]).addClass("script");
                $container.append($script);
            }
        });
    };

    function render_stack(script) {
        var $script = $(document.createElement("div"));
        for (var i=0; i<script.length; i++) {
            var info = script[i];
            $script.append(render_stack_item(info));
            if (info.comment !== undefined) {
                $script.append(render_comment(info));
            }
        }
        return $script;
    }

    function render_stack_item(info) {
        switch (info.type) {
            case "cwrap":
                var $cwrap = render_stack(info.contents).addClass("cwrap")
                                .addClass(info.category);
                if (info.shape === "cap") $cwrap.addClass(info.shape)
                return $cwrap;

            case "cmouth":
                return render_stack(info.contents).addClass("cmouth")
                                .addClass(info.category);

            default:
                return render_block(info);
        }
    }

    function render_comment(info) {
        var $comment = $(document.createElement("div")).addClass("comment")
                .append($(document.createElement("div"))
                .append(document.createTextNode(info.comment.trim() || " ")));
        if (info.shape) {
            $comment.addClass("attached");
            $comment.addClass("to-" + info.shape);
        }
        return $comment;
    }

    function render_block(info) {
        if (!code) return;

        // make DOM element
        var $block = $(document.createElement("div"));
        $block.addClass(info.shape);
        $block.addClass(info.category);
        if (info.flag) $block.addClass(info.flag); // TODO remove
        $block.category = info.category; // TODO remove
        $block.shape = info.shape; // TODO remove

        // color insert?
        if (info.shape === "color") {
            $block.css({"background-color": info.pieces[0]});
            $block.text(" ");
            return $block;
        }

        // ringify?
        var $ring;
        if (info.is_ringed) {
            $ring = $(document.createElement("div")).addClass("ring")
                               .addClass(info.shape).append($block);
        }
        if (info.blockid === "_" && info.category === "grey") {
            $block.addClass("ring-outer");
        }

        // empty?
        if (!info.pieces.length && info.flag !== "cend") {
            $block.addClass("empty");
            $block.removeClass("obsolete");
            return $ring || $block;
        }

        // output text segments & args
        for (var i=0; i<info.pieces.length; i++) {
            var piece = info.pieces[i];
            if (typeof piece === "object") {
                $block.append(render_block(piece));
            } else if (piece === "@" && info.image_replacement) {
                var $image = $("<span>")
                $image.addClass(info.image_replacement);
                $block.append($image);
            } else if (/[▶◀▸◂]/.test(piece)) {
                $block.append(
                    $(document.createElement("span")).addClass("arrow")
                        .append(document.createTextNode(piece)));
            } else {
                if (!piece) piece = " ";
                $block.append(document.createTextNode(piece));
            }
        }

        return $ring || $block;
    }

    /* Return the category class for the given block. */
    function get_block_category($block) {
        var CATEGORIES = ["obsolete", "control", "custom", "events", "list",
            "looks", "motion", "operators", "pen", "sensing", "sound",
            "variables", "extension", "grey"];
        for (var i=0; i<CATEGORIES.length; i++) {
            if ($block.hasClass(CATEGORIES[i])) {
                return CATEGORIES[i];
            }
        }
        return $block.category; // TODO
    }

    /* Return the shape class for the given insert. */
    function get_arg_shape($arg) {
        if (!$arg) {
            return "";
        }
        return $arg.shape; // TODO
    }

    /* Get text from $block DOM element. Make sure you clone the block first. */
    function get_block_text($block) {
        $block.children().remove();
        return minify($block.text());
    }

    return sb2; // export the module
}(jQuery);
