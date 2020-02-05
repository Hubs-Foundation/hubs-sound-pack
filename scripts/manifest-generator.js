const fs = require("fs");
const path = require("path");

async function traverseFiles(curPath, cb) {
  const dir = await fs.promises.opendir(curPath);

  for await (const dirent of dir) {
    const absPath = path.join(curPath, dirent.name);

    if (dirent.isDirectory()) {
      await traverseFiles(absPath, cb);
    } else if (dirent.isFile()) {
      cb(dirent, absPath);
    }
  }
}

async function main() {
  const projectPath = path.resolve(__dirname, "..");
  const assetsPath = path.join(projectPath, "Audio");

  const manifest = {
    name: "Hubs Sound Pack",
    assets: [],
    tags: []
  };

  await traverseFiles(assetsPath, (dirent, absPath) => {
    if (path.extname(absPath) !== ".mp3") {
      return;
    }

    const relativePath = path.relative(assetsPath, absPath).replace(/\\/g, "/");

    const dirPath = path.parse(relativePath).dir;

    const parts = dirPath.split("/");
    const tags = [];

    if (parts.length === 1) {
      tags.push("Full_Mix");
    }

    while (parts.length > 0) {
      tags.push(parts.join("/"));
      parts.pop();
    }

    const fileName = dirent.name.replace(".mp3", "");

    manifest.assets.push({
      id: fileName,
      label: fileName.replace(/_/g, " "),
      type: "Audio",
      url: relativePath,
      tags
    })
  });

  const uniqueTags = new Set();

  for (const asset of manifest.assets) {
    for (const tag of asset.tags) {
      uniqueTags.add(tag);
    }
  }

  const tagTree = [];

  for (const tag of uniqueTags) {
    const parts = tag.split("/");

    let curPart = parts.shift().replace(/_/g, " ");
    let curArray = tagTree;

    while (curPart) {
      let curNode = curArray.find(n => n.label === curPart);

      if (!curNode) {
        curNode = {
          label: curPart,
          value: tag
        };

        curArray.push(curNode);
      }

      curPart = parts.shift();

      if (curPart) {
        if (!curNode.children) {
          curNode.children = [];
        }

        curArray = curNode.children;
      }
    }
  }

  manifest.tags = tagTree;

  const manifestPath = path.join(assetsPath, "asset-manifest.json");
  const json = JSON.stringify(manifest, null, 2);

  await fs.promises.writeFile(manifestPath, json, "utf8");

  console.log(`Wrote manifest to ${manifestPath}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
