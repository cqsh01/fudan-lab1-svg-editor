export class LaunchHelp {
  render(): readonly string[] {
    return [
      'SVG Editor · Scriptable vector editing', '',
      'Usage: svg-editor [options]', '',
      'Options:',
      '  -h, --help       Show this help and exit',
      '  -v, --version    Show the installed version',
      '  --preview        Start a local live preview; open the printed URL',
      '  --terminal-preview  Print the current canvas after changes',
      '  --port <number>  Choose a preview port (default: automatic)',
      '  --recover        Resume the latest recovery draft',
      '  --recovery-dir <directory>  Choose the draft directory',
      '  --discard-unsaved          Skip prompts and discard unsaved work on exit', '',
      'Start an interactive session, or replay commands through stdin:',
      '  svg-editor',
      '  svg-editor < drawing.commands',
      '  svg-editor --preview',
      '  svg-editor --terminal-preview',
      '  svg-editor --recover --preview', '',
      'Inside the editor: help · init · create · view · tree · status · save · exit',
      'Example: create rect card 40 60 180 80 #133f4b',
    ];
  }
}
