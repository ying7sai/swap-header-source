# Swap Header/Source

_Quickly_ swap between C++ header and source files.

I made this extension for personal use out of frustration at how slow the builtin C/C++ swapping functionality is for larger projects. 

Existing extensions doing the same thing weren't quite as fast as I would have liked them to be.

I am releasing this extension in hopes that someone else will find it useful.

## Features

Swap between header/source files with:
* `Alt+O`
* `Ctrl+Shift+P` (`Cmd+Shift+P` on Mac) -> `Swap Header/Source`

If multiple valid swaps candidates are found, a quick picker prompt lets you decide which file to swap to.

Results are cached so subsequent swaps are lightning fast.

## Extension Settings

* `swapHeaderSource.headerExtensions`: Specify which file extensions qualify as header files
* `swapHeaderSource.sourceExtensions`: Specify which file extensions qualify as source files
* `swapHeaderSource.disableCaching`: Disable caching if you prefer

## Release Notes

### 1.0.0

Initial release
