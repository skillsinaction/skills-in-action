#!/usr/bin/env bash
# Run each setup N times on a fresh copy of this repo; save the raw JSON.
# usage: bench/run.sh 5
set -u
N=${1:-5}; OUT=bench/results; mkdir -p $OUT
for i in $(seq 1 $N); do
  for setup in claude-solo claude-team codex-solo codex-team; do
    tool=${setup%-*}; mode=${setup#*-}
    prompt=bench/solo.txt; [ $mode = team ] && prompt=bench/team-$tool.txt
    dir=$(mktemp -d); git archive HEAD | tar -x -C $dir
    [ $mode = solo ] && rm -rf $dir/.claude/agents $dir/.codex/agents
    start=$(date +%s%N)
    if [ $tool = claude ]; then
      (cd $dir && claude -p "$(cat $prompt)" --output-format json \
        --json-schema "$(cat bench/review.schema.json)") > $OUT/$setup-$i.json
    else
      (cd $dir && codex exec -s read-only --skip-git-repo-check --json --output-schema bench/review.schema.json \
        -o $OLDPWD/$OUT/$setup-$i.last.json "$(cat $prompt)") > $OUT/$setup-$i.jsonl
    fi
    ms=$(( ($(date +%s%N) - start) / 1000000 ))
    echo "$setup run $i: $((ms/1000)).$(( (ms%1000)/100 ))s" | tee -a $OUT/times.txt
    rm -rf $dir
  done
done
