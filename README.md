**⚠️ This project is not supported and should not be used. Google Apps Script has come a long way since this was created, and a lot more JavaScript is now usable in that environment, making this unnecessary. ⚠️**

# CanVis


CanVis is a simple jQuery plugin that converts an element's content into a `<canvas>` bar/line/step or pie chart. A fork of the Peity library, it retains the use of canvas instead of svg in order to work within a Caja environment like Google Apps Script's HTML Service. Although it still works for small inline charts, its new purpose is to create dashboards.

## Basic Usage

### HTML

```html
<span class="pie">3/5</span>
<span class="combo">3,5,1,6,2</span>
```

### Javascript (jQuery)

```js
$("span.pie").canvis("pie");
$("span.combo").canvis("combo");
```

## Docs

More detailed usage can be found at in `index.html` although the documentation is woefully out of date. Good luck.

## Copyright

Copyright 2009-2014 [Ben Pickles](http://benpickles.com/). See [MIT-LICENCE](https://github.com/benpickles/peity/blob/master/MIT-LICENCE) for details.

Copyright 2014 Fred Morel. See [MIT-LICENCE](https://github.com/fmorel90/canvis/blob/master/MIT-LICENCE) for details.
