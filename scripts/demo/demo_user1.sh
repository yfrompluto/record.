#!/bin/bash
set -e

# =================================================
#     Automated user account setup for a demo
# =================================================

# Account settings
USERNAME="130bear"
USERMAIL="130bear@demo.com"
PASSWORD="Test123!"
DISPLAY_NAME="sash"
BIO="kali uchis - iz*one ft.TH-93 ouhouhouhouh"
COOKIE="cookies_${USERNAME}.txt"
BASE="https://localhost:8443/api"

#
ALBUM_1="dc20bbac-b8a4-4ed4-8c29-4ea851a18489" # the mocking stars
ALBUM_2="c6ea2862-095a-4691-8530-1e8dbd2c105a" # th e-trap
ALBUM_3="553caf38-31f7-4cd7-b807-fd8eb86c655e" # brent ftw
ALBUM_4="57561634-f7bb-4e27-aa14-16d0ff79a001" # kali isolations

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
	-d '{"score": 4.5, "review": "i dont wanna get a job naaaaahhh (them trumpets tho..)"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_2/rating" \
	-H "Content-Type: application/json" \
	-d '{"score": 4.5, "review": "des textes poignants + le terrain sotc (song of the century)"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_3/rating" \
	-H "Content-Type: application/json" -d '{"score": 4}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_4/rating" \
	-H "Content-Type: application/json" -d '{"score": 4, "review": "slower, slower wow"}'

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