/**
 * cssmin.js
 * Author: Stoyan Stefanov - http://phpied.com/
 * This is a JavaScript port of the CSS minification tool
 * distributed with YUICompressor, itself a port
 * of the cssmin utility by Isaac Schlueter - http://foohack.com/
 * Permission is hereby granted to use the JavaScript version under the same
 * conditions as the YUICompressor (original YUICompressor note below).
 */

/*
 * YUI Compressor
 * http://developer.yahoo.com/yui/compressor/
 * Author: Julien Lecomte - http://www.julienlecomte.net/
 * Copyright (c) 2011 Yahoo! Inc. All rights reserved.
 * The copyrights embodied in the content of this file are licensed
 * by Yahoo! Inc. under the BSD (revised) open source license.
 */
function cssmin(css, linebreak_at_column) {
  var start_index = 0, end_index = 0, i = 0, max = 0, total_len = css.length
    , preserved_tokens = [], comments = [], token = '', placeholder = ''
    , alpha_filter_re = /progid:DXImageTransform\.Microsoft\.Alpha\(Opacity=/gi;

  // collect all comment blocks
  while ((start_index = css.indexOf("/*", start_index)) >= 0) {
    end_index = css.indexOf("*/", start_index + 2);
    if (end_index < 0) {
      end_index = total_len;
    }
    token = css.slice(start_index + 2, end_index);
    comments.push(token);
    css = css.slice(0, start_index + 2) +
          "___YUICSSMIN_PRESERVE_CANDIDATE_COMMENT_" + (comments.length - 1) +
          "___" + css.slice(end_index);
    start_index += 2;
  }

  // preserve strings so their content doesn't get accidentally minified
  css = css.replace(/("([^\\"]|\\.|\\)*")|('([^\\']|\\.|\\)*')/g,
  function preserveString(match) {
    var i, max, quote = match.substring(0, 1);

    match = match.slice(1, -1);

    // maybe the string contains a comment-like substring?
    // one, maybe more? put'em back then
    if (match.indexOf("___YUICSSMIN_PRESERVE_CANDIDATE_COMMENT_") >= 0) {
      for (i = 0, max = comments.length; i < max; i = i + 1) {
        match = match.replace("___YUICSSMIN_PRESERVE_CANDIDATE_COMMENT_" + i +
                              "___", comments[i]);
      }
    }

    // minify alpha opacity in filter strings
    match = match.replace(alpha_filter_re, "alpha(opacity=");

    preserved_tokens.push(match);
    return quote + "___YUICSSMIN_PRESERVED_TOKEN_" +
           (preserved_tokens.length - 1) + "___" + quote;
  });

  // strings are safe, now wrestle the comments
  for (i = 0, max = comments.length; i < max; i = i + 1) {
    token = comments[i];
    placeholder = "___YUICSSMIN_PRESERVE_CANDIDATE_COMMENT_" + i + "___";

    // ! in the first position of the comment means preserve
    // so push to the preserved tokens, keeping the !
    if (token.charAt(0) === "!") {
      preserved_tokens.push(token);
      css = css.replace(placeholder,  "___YUICSSMIN_PRESERVED_TOKEN_" +
                        (preserved_tokens.length - 1) + "___");
      continue;
    }

    // \ in the last position looks like hack for Mac/IE5
    // shorten that to /*\*/ and the next one to /**/
    if (token.charAt(token.length - 1) === "\\") {
      preserved_tokens.push("\\");
      css = css.replace(placeholder,  "___YUICSSMIN_PRESERVED_TOKEN_" +
                        (preserved_tokens.length - 1) + "___");
      i = i + 1; // attn: advancing the loop
      preserved_tokens.push("");
      css = css.replace("___YUICSSMIN_PRESERVE_CANDIDATE_COMMENT_" + i + "___",
                        "___YUICSSMIN_PRESERVED_TOKEN_" +
                        (preserved_tokens.length - 1) + "___");
      continue;
    }

    // keep empty comments after child selectors (IE7 hack)
    // e.g. html >/**/ body
    if (token.length === 0) {
      start_index = css.indexOf(placeholder);
      if (start_index > 2) {
        if (css.charAt(start_index - 3) === '>') {
          preserved_tokens.push("");
          css = css.replace(placeholder,
                            "___YUICSSMIN_PRESERVED_TOKEN_" +
                            (preserved_tokens.length - 1) + "___");
        }
      }
    }

    // in all other cases kill the comment
    css = css.replace("/*" + placeholder + "*/", "");
  }


  // Normalize all whitespace to single spaces. Easier to work with, that way.
  css = css.replace(/\s+/g, " ");

  // Remove spaces before the things that need not have spaces before them.
  // But, be careful not to turn "p :link {...}" into "p:link{...}"
  // Swap out any pseudo-class colons with the token, and then swap back.
  css = css.replace(/(^|\})(([^\{:])+:)+([^\{]*\{)/g, function (m) {
    return m.replace(":", "___YUICSSMIN_PSEUDOCLASSCOLON___");
  });
  css = css.replace(/\s+([!{};:>+\(\)\],])/g, '$1');
  css = css.replace(/___YUICSSMIN_PSEUDOCLASSCOLON___/g, ":");

  // retain space for special IE6 cases
  css = css.replace(/:first-(line|letter)(\{|,)/g, ":first-$1 $2");

  // no space after the end of a preserved comment
  css = css.replace(/\*\/ /g, '*/');


  // If there is a @charset, only allow one, and push it to the top of the file.
  css = css.replace(/^(.*)(@charset "[^"]*";)/gi, '$2$1');
  css = css.replace(/^(\s*@charset [^;]+;\s*)+/gi, '$1');

  // Put the space back in some cases, to support stuff like
  // @media screen and (-webkit-min-device-pixel-ratio:0){
  css = css.replace(/\band\(/gi, "and (");


  // remove spaces after things that need not have spaces after them
  css = css.replace(/([!{}:;>+\(\[,])\s+/g, '$1');

  // remove unnecessary semicolons
  css = css.replace(/;+\}/g, "}");

  // replace 0(px,em,%) with 0
  css = css.replace(/([\s:])(0)(px|em|%|in|cm|mm|pc|pt|ex)/gi, "$1$2");

  // replace 0 0 0 0; with 0
  css = css.replace(/:0 0 0 0(;|\})/g, ":0$1");
  css = css.replace(/:0 0 0(;|\})/g, ":0$1");
  css = css.replace(/:0 0(;|\})/g, ":0$1");

  // replace background-position:0; with background-position:0 0;
  // and the same for transform-origin
  css = css.replace(/(background-position|(?:(?:ms|moz|o|webkit)-)?transform-origin):0(;|\})/gi, function(all, prop, tail) {
    return prop.toLowerCase() + ":0 0" + tail;
  });

  // replace 0.6 to .6, but only when preceded by : or a white-space
  css = css.replace(/(:|\s)0+\.(\d+)/g, "$1.$2");

  // shorten variants on rgba(r,g,b,1) to rgb(r,g,b)
  // (makes it more likely that it'll get further compressed in the next step)
  css = css.replace(/rgba\s*\(([\d,\s]+),\s*1(?:\.0+)?\s*\)/gi,
                    function (all, rgb) { return 'rgb('+ rgb +')'; });

  // shorten colors from rgb(51,102,153) to #336699
  // (makes it more likely that it'll get further compressed in the next step)
  css = css.replace(/rgb\s*\(\s*([0-9,\s]+)\s*\)/gi, function hexify(all, rgb) {
    rgb = rgb.split(',');
    for (var i = 0; i < rgb.length; i = i + 1) {
      rgb[i] = parseInt(rgb[i], 10).toString(16);
      if (rgb[i].length === 1) {
        rgb[i] = '0' + rgb[i];
      }
    }
    return '#' + rgb.join('');
  });


  // Shorten colors from #AABBCC to #ABC. Note that we want to make sure
  // the color is not preceded by either ", " or =. Indeed, the property
  //   filter: chroma(color="#FFFFFF");
  // would become
  //   filter: chroma(color="#FFF");
  // which makes the filter break in IE.
  css = css.replace(/([^"'=\s])(\s*)#([\dA-F]{6})/gi, function(all, c, s, rgb) {
    var rrggbb = rgb.toUpperCase(), r, g, b, shorter = ( // sub-7-char aliases:
        { '000080': 'navy'
        , '008000': 'green'
        , '008080': 'teal'
        , '800000': 'maroon'
        , '800080': 'purple'
        , '808000': 'olive'
        , '808080': 'gray'
        , 'C0C0C0': 'silver'
        , 'FF0000': 'red'
        , 'FFA500': 'orange'
        })[rrggbb];
    if (shorter) return c + s + shorter;

    if ((r = rrggbb.charAt(0)) === rrggbb.charAt(1) &&
        (g = rrggbb.charAt(2)) === rrggbb.charAt(3) &&
        (b = rrggbb.charAt(4)) === rrggbb.charAt(5))
      return c + s +'#'+ r + g + b;
    return all.toUpperCase();
  });

  // border: none -> border:0
  css = css.replace(/(border(?:-(?:top|right|bottom|left))?|outline|background):none(;|\})/gi, function(all, prop, tail) {
    return prop.toLowerCase() +":0"+ tail;
  });

  // shorter opacity IE filter
  css = css.replace(alpha_filter_re, "alpha(opacity=");

  // remove empty rules
  css = css.replace(/[^\};\{\/]+\{\}/g, "");

  if (linebreak_at_column >= 0) {
    // Some source control tools crap out as files containing lines longer than,
    // say, 8000 characters, are checked in. The linebreak option is used in
    // that case to split long lines after a specific column.
    start_index = i = 0;
    while (i < css.length) {
      i = i + 1;
      if (css[i - 1] === '}' && i - start_index > linebreak_at_column) {
        css = css.slice(0, i) +'\n'+ css.slice(i);
        start_index = i;
      }
    }
  }

  // replace multiple semi-colons in a row by a single one
  // See SF bug #1980989
  css = css.replace(/;{2,}/g, ";");

  // restore preserved comments and strings
  for (i = 0, max = preserved_tokens.length; i < max; i = i + 1) {
    css = css.replace("___YUICSSMIN_PRESERVED_TOKEN_" + i + "___",
                      preserved_tokens[i]);
  }

  // trim the final string (for any leading or trailing white spaces)
  css = css.replace(/^\s+|\s+$/g, "");

  return css;
}
