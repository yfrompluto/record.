#!/bin/bash
set -e

# =================================================
#     Automated user account setup for a demo
# =================================================

# Account settings
USERNAME="xoxo"
USERMAIL="xoxo@demo.com"
PASSWORD="28072005Violette&"
DISPLAY_NAME=":D"
BIO="hello love music"
COOKIE="cookies_${USERNAME}.txt"
BASE="https://localhost:8443/api"

#
ALBUM_1="d5b40a5b-125f-4e2d-926d-746dbc6a2257" # MAXIDENT
ALBUM_2="8630bdf2-e6df-4cfa-9491-ec95bad4b182" # When the lights turn on
ALBUM_3="a868464a-2e60-484b-bacd-aaeaee71284e" # The Romantic
ALBUM_4="f2b45cd0-d840-4723-b503-30c56e4a56f3" # AWAKE

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
	-d '{"score": 5, "review": "MAXIDENT one of the best album eveeeer !"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_2/rating" \
	-H "Content-Type: application/json" \
	-d '{"score": 4.5, "review": "Love the lyrics and all the work put in it !"}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_3/rating" \
	-H "Content-Type: application/json" -d '{"score": 5}'
sleep 1
curl -sk -b "$COOKIE" -X PUT "$BASE/albums/$ALBUM_4/rating" \
	-H "Content-Type: application/json" -d '{"score": 4.5, "review": "so much energyy"}'

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