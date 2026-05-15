module.exports = {
  appId:       'com.learningowl.owlconverter',
  productName: 'OwlConverter',
  copyright:   'Copyright © 2026 Learning Owl',
  directories: {
    output: 'release',
  },
  files: [
    'dist/renderer/**/*',
    'src/main/**/*',
    'assets/**/*',
    'package.json',
  ],
  extraResources: [
    // Swivel AIR captive-runtime bundle (directory with exe + runtime DLLs)
    { from: 'binaries/swivel-bundle/', to: 'binaries/swivel-bundle/' },
    // FFmpeg single executable
    { from: 'binaries/ffmpeg.exe',    to: 'binaries/ffmpeg.exe' },
    { from: 'assets/',                to: 'assets/' },
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'assets/icon.ico',
  },
  nsis: {
    oneClick:          true,
    installerLanguages: ['en_US'],
    license:           'LICENSE',
  },
  publish: {
    provider: 'github',
    owner:    'hardiklearningowl',
    repo:     'owl-converter',
  },
}
