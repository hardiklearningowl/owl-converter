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
    { from: 'binaries/', to: 'binaries/', filter: ['*.exe'] },
    { from: 'assets/',   to: 'assets/' },
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
    owner:    'learningowl',
    repo:     'owl-converter',
  },
}
