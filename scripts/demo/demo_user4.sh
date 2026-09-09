#!/bin/bash
set -e

# =================================================
#     Automated user account setup for a demo
# =================================================

# Account settings
USERNAME="frompluto"
USERMAIL="frompluto@demo.com"
PASSWORD="Test123!"
DISPLAY_NAME="frompluto"
BIO=" 134340 eclectic alchemist"
COOKIE="cookies_${USERNAME}.txt"
BASE="https://localhost:8443/api"

#
ALBUM_1="3a7817b5-22cb-32c3-a31b-2c8309fbf92e" # thriller mj
ALBUM_2="0c482acd-35a2-466b-b833-ef5f2f1297d4" # anti rihanna
ALBUM_3="6bd70eee-bd46-4738-851a-f50c19d8d6db" # kendrick 
ALBUM_4="52859a02-4538-4e5c-b484-7d179f4c6ff6" # wasteland

rm -f "$COOKIE"

printf "[+] Registering $USERNAME... \n"
REGISTER_BODY=$(jq -n --arg u "$USERNAME" --arg m "$USERMAIL" --arg p "$PASSWORD" \
	'{username: $u, userMail: $m, password: $p}')
curl -sk -s -c "$COOKIE" -X POST "$BASE/auth/register" \
	-H "Content-Type: application/json" -d "$REGISTER_BODY"

printf "[~] Logging in $USERNAME..."
LOGIN_BODY=$(jq -n --arg u "$USERNAME" --arg p "$PASSWORD" '{username: $u, password: $p}')
curl -sk -c "$COOKIE" -X POST "$BASE/auth/login" \
	-H "Content-Type: application/json" -d "$LOGIN_BODY"

printf "[~] Setting display name + bio... \n"
PROFILE_BODY=$(jq -n --arg d "$DISPLAY_NAME" --arg b "$BIO" '{displayName: $d, bio: $b}')
curl -sk -b "$COOKIE" -X PATCH "$BASE/users/me" \
	-H "Content-Type: application/json" -d "$PROFILE_BODY"

printf "[+] Rating albums... \n"
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_1/rating" \
	-H "Content-Type: application/json" \
	-d '{"score": 4.5, "review": "real king, come back OGGGGG!"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_2/rating" \
	-H "Content-Type: application/json" \
	-d '{"score": 4.5, "review": "where are you rihanna!!"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_3/rating" \
	-H "Content-Type: application/json" -d '{"score": 4}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_4/rating" \
	-H "Content-Type: application/json" -d '{"score": 4}'

# INFO DEV / un album doit etre en collection pour etre favori, apres faites comme vous voulez
printf "[+] Adding album to collection/favourite... \n"
curl -sk -b "$COOKIE" -X POST "$BASE/albums/$ALBUM_2/collection"
curl -sk -b "$COOKIE" -X PATCH "$BASE/albums/$ALBUM_2/collection/favorite"
curl -sk -b "$COOKIE" -X POST "$BASE/albums/$ALBUM_1/collection"
curl -sk -b "$COOKIE" -X POST "$BASE/albums/$ALBUM_3/collection"

printf "[+] Creating playlist(s)... \n"
PLAYLIST_RESPONSE=$(curl -sk -b "$COOKIE" -X POST "$BASE/playlists" \
	-H "Content-Type: application/json" \
	-d "$(jq -n '{title: "fav"}')")
MY_PLAYLIST=$(printf "$PLAYLIST_RESPONSE" | jq -r '.id')

if [ "$MY_PLAYLIST" = "null" ] || [ -z "$MY_PLAYLIST" ]; then
	printf "[x] Playlist creation failed: $PLAYLIST_RESPONSE"
	exit 1
fi

printf "Adding albums to playlist $MY_PLAYLIST..."
curl -sk -b "$COOKIE" -X POST "$BASE/playlists/$MY_PLAYLIST/albums/$ALBUM_3"

printf "[ok] $USERNAME demo account all set!"