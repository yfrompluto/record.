#!/bin/bash
set -e

# =================================================
#		Automated user account setup for a demo
# =================================================

DIR="$(dirname "$0")"

"$DIR/demo_user1.sh"

sleep 1
"$DIR/demo_user2.sh"

sleep 1
"$DIR/demo_user3.sh"

sleep 1
"$DIR/demo_user4.sh"
