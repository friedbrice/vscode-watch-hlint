# vscode-watch-hlint

Read diagnostics from hlint.json

## Usage

The extension watches `hlint.json` for changes, parses its content, and reports its findings to VS Code as diagnostics.

This plugin does not run Hlint for you (though future versions might).
You can run Hlint on file save using the `--test` option for Ghcid.

```console
ghcid --test ":! hlint . --json > hlint.json"
```

## Credits

Most of this code was basically vendored from [VSCode haskell-ghcid](https://github.com/ndmitchell/ghcid/tree/master/plugins/vscode).
Thanks to [ndmitchell](https://github.com/ndmitchell), [chrismwendt](https://github.com/chrismwendt), and [yairchu](https:/github.com/yairchu).
