// =====================================================================
//		The gloabl API request handler for the nginx proxy.
//		It manages HTTP requests, credentials, error handling, exposes
//		exposes authentication helpers
// =====================================================================

/* ******** NGINX PROXY ******** */
const API_BASE_URL = "/api";

async function request(path, options = {}) {
	const isFormData = options.body instanceof FormData;

	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: isFormData ? undefined : { "Content-Type": "application/json" },
		credentials: 'include',
		...options,
	});

	if (!response.ok) {
		const text = await response.text();
		let message;
		try {
		message = JSON.parse(text).message;
		} catch {}

		const error = new Error(message);
		error.status = response.status;

		if (response.status === 401) {
		window.dispatchEvent(new Event('auth:expired'));
		}

		throw error;
	}

	if (response.status === 204) {
		return null;
	}

	const text = await response.text();
	return text ? JSON.parse(text) : null;
}

/* ******** AUTH  ******** */
function login(username, password) {
   return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
   });
}

function register(username, userMail, password) {
   return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, userMail, password }),
   });
}

function me() {
   return request('/users/me', {
      method: 'GET',
   });
}

function logout() {
   return request('/auth/logout', {
      method: 'POST',
   });
}

/* ******** HEALTH, STATUS, HELP ******** */
function health() {
	return request('/health', {
		method: 'GET',
  });
}

/* ******** PROFILE - update, upload ******** */
function updateProfile(data) {
   return request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
   });
}

function uploadAvatar(file) {
   const formData = new FormData();
   formData.append('avatar', file);

   return request('/users/me/avatar', {
      method: 'POST',
      body: formData,
   });
}

/* ******** USER ANALYTICS - stats ******** */
function getMyStats() {
	return request('/users/me/stats', { method: 'GET' });
}

/* ******** ALBUMS - search & rate ******** */
function searchAlbums(query) {
	return request(`/music/search?q=${encodeURIComponent(query)}`, {
		method: 'GET',
	});
}

function getAlbumDetail(mbid) {
	return request(`/music/albums/${mbid}`, {
		method: 'GET',
	});
}

function rateAlbum(mbid, score, review) {
   return request(`/albums/${mbid}/rating`, {
      method: 'PUT',
      body: JSON.stringify({ score, review }),
   });
}

function removeAlbumRating(mbid) {
	return request(`/albums/${mbid}/rating`, {
		method: 'DELETE',
	});
}

function rateTrack(albumMbid, trackMbid, score) {
	return request(`/albums/${albumMbid}/tracks/${trackMbid}/rating`, {
		method: 'PUT',
		body: JSON.stringify({ score }),
	});
}

function removeTrackRating(albumMbid, trackMbid) {
	return request(`/albums/${albumMbid}/tracks/${trackMbid}/rating`, {
		method: 'DELETE',
	});
}


function getAlbumRating(mbid) {
	return request(`/albums/${mbid}/rating`, {
		method: 'GET',
	});
}

function getTrackRatings(mbid) {
	return request(`/albums/${mbid}/tracks/ratings`, {
		method: 'GET',
	});

}

// export async function getUserRatings(username) {
// 	const res = await fetch(`/api/users/${username}/ratings`, {
// 		credentials: "include",
// 	})
// 	if (!res.ok) {
// 		const error = new Error("Failed to fetch ratings")
// 		error.status = res.status
// 		throw error
// 	}
// 	return res.json()
// }

function likeRating(ratingId) {
	return request(`/ratings/${ratingId}/like`, { method: 'POST' });
}

function unlikeRating(ratingId) {
	return request(`/ratings/${ratingId}/like`, { method: 'DELETE' });
}

function deleteRec(mbid) {
	return request(`/albums/${mbid}/rec`, {
		method: 'DELETE',
	});
}

/* ******** COLLECTIONS - add, remove, is in collection ******** */
function addToCollection(mbid) {
  return request(`/albums/${mbid}/collection`, { method: 'POST' });
}

function removeFromCollection(mbid) {
  return request(`/albums/${mbid}/collection`, { method: 'DELETE' });
}

function isInCollectionCheck(mbid) {
  return request(`/albums/${mbid}/collection`, { method: 'GET' });
}

function getCollection(page = 1, pageSize = 8, search = '') {
	const params = new URLSearchParams();
	params.set('page', String(page));
	params.set('pageSize', String(pageSize));
	if (search)
		params.set('q', search);

	return request(`/users/me/collection?${params.toString()}`, {
		method: 'GET',
	});
}

function toggleFavorite(mbid) {
	return request(`/albums/${mbid}/collection/favorite`, {
		method: 'PATCH',
	});
}

/* ******** PLAYLISTS - list, update, create, delete, and see playlists  ******** */
function listMyPlaylists() {
  return request('/playlists/me', { method: 'GET' });
}

function createPlaylist(data) {
  return request('/playlists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

function getUserPlaylists(userId) {
	return request(`/users/${userId}/playlists`, {
		method: 'GET',
	});
}

function getPlaylist(id) {
	return request(`/playlists/${id}`, {
		method: 'GET',
	});
}

function updatePlaylist(id, dto) {
	return request(`/playlists/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(dto),
	});
}

function deletePlaylist(id) {
	return request(`/playlists/${id}`, {
		method: 'DELETE',
	});
}

function addAlbumToPlaylist(playlistId, mbid) {
  return request(`/playlists/${playlistId}/albums/${mbid}`, { method: 'POST' });
}

function removeAlbumFromPlaylist(playlistId, mbid) {
  return request(`/playlists/${playlistId}/albums/${mbid}`, { method: 'DELETE' });
}

/* ******** HOME & EXPLORER ******** */
function getTrending () {
	return request('/explore.trending', {
		method: 'GET',
	});
}

function getTopRated() {
	return request('/explore/top-rated', {
		method: 'GET',
	});
}

function getRandomAlbum() {
	return request('/explore/random', {
		method: 'GET',
	});
}

/* ******** SOCIAL - friends, chat, user profiles ******** */
function getFriendsActivity() {
	return request('/explore/friends-activity', {
		method: 'GET',
	});
}

function getUserProfile(username) {
	return request(`/users/${username}`, {
		method: 'GET',
	});
}

function getFriendsList() {
	return request('/friends', {
		method: 'GET',
	});
}

/* ******** NOTIFICATIONS ******** */
function getNotifications() {
	return request('/notifications', { method: 'GET' });
}

function getUnreadCount() {
	return request('/notifications/unread-count', { method: 'GET' });
}

function markNotificationAsRead(id) {
	return request(`/notifications/${id}/read`, { method: 'POST' });
}

function markAllNotificationsAsRead() {
	return request('/notifications/read-all', { method: 'POST' });
}

/* ALL METHODS */
export default {
	request,
	login,
	register,
	me,
	logout,
	updateProfile,
	uploadAvatar,
	health,
	getMyStats,
	searchAlbums,
	getAlbumDetail,
	rateAlbum,
	removeAlbumRating,
	rateTrack,
	removeTrackRating,
	addToCollection,
	removeFromCollection,
	isInCollectionCheck,
	listMyPlaylists,
	createPlaylist,
	addAlbumToPlaylist,
	removeAlbumFromPlaylist,
	getAlbumRating,
	getTrackRatings,
	// getUserRatings,
	likeRating,
	unlikeRating,
	getTrending,
	getTopRated,
	getRandomAlbum,
	getFriendsActivity,
	getNotifications,
	getUnreadCount,
	markNotificationAsRead,
	markAllNotificationsAsRead,
	getCollection,
	toggleFavorite,
	getUserProfile,
	getUserPlaylists,
	getPlaylist,
	updatePlaylist,
	deletePlaylist,
	deleteRec,
	getFriendsList,
};