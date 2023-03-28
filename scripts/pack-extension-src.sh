#!/usr/bin/env bash


# AMO requires us to provide source code.

# usage ./pack-extension-src.sh

file_dir=$(dirname $(realpath "$0"))
root_dir=$(dirname $file_dir)

if [ "$PWD" = $root_dir ]; then
  echo "Working Dir OK!"
else
  echo "[EXIT] This script can only be executed in $root_dir"
  exit 1
fi

#================================================
# pack extension source
#================================================

if [ "$MX_FIREFOX_ID" = "" ]; then
  echo "Environment variable MX_FIREFOX_ID is empty"
  exit 1
fi

version=$(grep -e \"version\": package.json | cut -d \" -f 4)

echo "Version: $version"

# project root
dir=$root_dir
src=$(realpath "$dir/src")
dist=$(realpath "$dir/dist/extension-src")

extname="maoxian-web-clipper"


echo "Packing extension source"
mkdir -p "$dist/$extname"

for fname in package.json package-lock.json webpack.config.js README.md README-DEV.md LICENSE; do
  cp $dir/$fname $dist/$extname/$fname
done
cp -r $dir/src $dist/$extname
rm -f "$dist/$extname/manifest.chrome.json"

# generate NOTE_FOR_REVIEWER.md
reviewer_file_path=$dist/$extname/NOTE-FOR-REVIEWER.md
echo "# Note for reviewer" >> $reviewer_file_path
echo "" >> $reviewer_file_path

echo "After you extracting the source file and changing directory to the extracted folder, run the belowing commands:" >> $reviewer_file_path
echo "" >> $reviewer_file_path

echo "1. install dependencies (better with: node V18.15.0 which has npm V9.5.0)" >> $reviewer_file_path
echo "" >> $reviewer_file_path
echo "\`\`\`shell" >> $reviewer_file_path
echo "npm install" >> $reviewer_file_path
echo "\`\`\`" >> $reviewer_file_path
echo "" >> $reviewer_file_path

echo "2. build the code:" >> $reviewer_file_path
echo "" >> $reviewer_file_path
echo "The environment variable \"MX_FIREFOX_ID\" is the browser extension ID that generated by AMO." >> $reviewer_file_path
echo "" >> $reviewer_file_path
echo "\`\`\`shell" >> $reviewer_file_path
echo "MX_FIREFOX_ID=$MX_FIREFOX_ID && npm run build-firefox" >> $reviewer_file_path
echo "\`\`\`" >> $reviewer_file_path
echo "" >> $reviewer_file_path

echo "After the execution, the target file was placed in dist/extension/ ." >> $reviewer_file_path
echo "" >> $reviewer_file_path
echo "" >> $reviewer_file_path
echo "If you want to run the developer environment, see ./README-DEV.md." >> $reviewer_file_path


archive="${extname}-src-${version}.zip"
rm -f $dist/$archive
cd $dist/$extname
zip --quiet -r $dist/$archive *
rm -rf $dist/$extname
echo "Done! ($dist/$archive)"
