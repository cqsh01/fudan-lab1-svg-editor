export class LaunchHelp {
  render(): readonly string[] {
    return [
      'SVG Editor · Scriptable vector editing', '',
      'Usage: svg-editor [options]', '',
      'Options:',
      '  -h, --help       Show this help and exit',
      '  -v, --version    Show the installed version', '',
      'Start an interactive session, or replay commands through stdin:',
      '  svg-editor',
      '  svg-editor < drawing.commands', '',
      'Inside the editor: help · init · create · tree · save',
      'Example: create rect card 40 60 180 80 #133f4b',
    ];
  }
}
