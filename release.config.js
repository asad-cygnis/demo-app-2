module.exports = {
  branches: ["dev"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md"
      }
    ],
    "@semantic-release/github"
  ],
  publish: [
    [
      "@semantic-release/github",
      {
        assets: [
          { path: "android/**/*.apk", label: "release-apk.apk" },
          { path: "builds/**/*.ipa", label: "release-ipa.ipa" }
        ]
      }
    ]
  ]
};
