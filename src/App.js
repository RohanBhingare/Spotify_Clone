import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Search from './Search';
import Tabs from './Tabs';
import './App.css';
import { FaPlay, FaPause, FaEllipsisH, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

const API_URL = 'https://cms.samespace.com/items/songs';
const COVER_IMAGE_URL = 'https://cms.samespace.com/assets/';

function App() {
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio());
  const [backgroundColor, setBackgroundColor] = useState('#121212');
  const [currentTab, setCurrentTab] = useState('For You');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isVolumeControlActive, setIsVolumeControlActive] = useState(false);
  const volumeRef = useRef(null);

  const fetchSongs = useCallback(async () => {
    try {
      const response = await axios.get(API_URL);
      const allSongs = response.data.data;

      const songsWithDuration = await Promise.all(allSongs.map(async (song) => {
        const duration = await fetchSongDuration(song.url);
        return { ...song, duration };
      }));

      const filtered = currentTab === 'Top Tracks' ? songsWithDuration.filter(song => song.top_track) : songsWithDuration;

      setSongs(songsWithDuration);
      setFilteredSongs(filtered);

    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  }, [currentTab]);

  useEffect(() => {
    fetchSongs();
  }, [currentTab, fetchSongs]);

  useEffect(() => {
    if (currentSong) {
      audio.src = currentSong.url;
      audio.currentTime = currentTime; // Set the currentTime to the saved currentTime
      audio.play().catch(error => console.error('Playback error:', error));
      setIsPlaying(true);
      setBackgroundColor(currentSong.accent);
      console.log('Updated background color:', currentSong.accent);
      audio.volume = volume;

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [currentSong, audio, volume]);

  const fetchSongDuration = (url) => {
    return new Promise((resolve, reject) => {
      const tempAudio = new Audio(url);
      tempAudio.onloadedmetadata = () => {
        resolve(tempAudio.duration);
      };
      tempAudio.onerror = () => {
        reject('Error fetching duration');
      };
    });
  };

  const playPause = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(error => console.error('Playback error:', error));
    }
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    const currentIndex = songs.findIndex(song => song.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    setCurrentTime(0); // Reset the currentTime to 0 when changing the song
  };

  const prevSong = () => {
    const currentIndex = songs.findIndex(song => song.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
    setCurrentTime(0); // Reset the currentTime to 0 when changing the song
  };

  const handleSongClick = song => {
    setCurrentSong(song);
    setCurrentTime(0); // Reset the currentTime to 0 when changing the song
  };

  const handleSearch = (query) => {
    const filtered = songs.filter(song =>
      song.name.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredSongs(filtered);
  };

  const handleSeek = (e) => {
    audio.currentTime = e.target.value;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const toggleMute = () => {
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  useEffect(() => {
    const handleScroll = (e) => {
      if (isVolumeControlActive) {
        const volumeChange = -e.deltaY / 1000;
        setVolume(prevVolume => {
          const newVolume = Math.max(0, Math.min(prevVolume + volumeChange, 1));
          audio.volume = newVolume;
          setIsMuted(newVolume === 0);
          return newVolume;
        });
      }
    };

    window.addEventListener('wheel', handleScroll);
    return () => {
      window.removeEventListener('wheel', handleScroll);
    };
  }, [isVolumeControlActive, audio]);

  return (
    <div className="app" style={{ background: `linear-gradient(135deg, ${backgroundColor} 0%, rgba(0, 0, 0, 0.9) 100%)` }}>
      <div className="container">
        <div className="column column-1">
          <div className="logo-container">
            <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_CMYK_Green.png" alt="Spotify" />
          </div>
          <div className="login-container">
            <button className="login-button">Login</button>
          </div>
        </div>
        <div className="column column-2">
          <div className="tabs-container">
            <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} />
            <Search onSearch={handleSearch} backgroundColor={backgroundColor} />
          </div>
          <div className="songs-container">
            <div className="songs">
              {filteredSongs.map(song => (
                <div
                  key={song.id}
                  className={`song ${song.id === currentSong?.id ? 'active' : ''}`}
                  onClick={() => handleSongClick(song)}
                >
                  <img src={`${COVER_IMAGE_URL}${song.cover}`} alt={song.name} className="cover-image-info" />
                  <div className="song-details">
                    <p className="song-name">{song.name}</p>
                    <p className="song-artist">{song.artist}</p>
                  </div>
                  <p className="song-duration">{formatTime(song.duration)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="column column-3">
          {currentSong && (
            <>
              <h1 className="song-title">{currentSong.name}</h1>
              <h2 className="song-artist1">{currentSong.artist}</h2>
              <img src={`${COVER_IMAGE_URL}${currentSong.cover}`} alt={currentSong.name} className="cover-image" />
              <div className="duration-container">
                <span className="current-time">{formatTime(currentTime)}</span>
                <div className="seeker-container">
                  <input
                    type="range"
                    className="seeker"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                  />
                </div>
                <span className="duration">{formatTime(duration)}</span>
              </div>
              <div className="controls">
                <button className="clo1"><FaEllipsisH /></button>
                <button onClick={prevSong}>&laquo;</button>
                <button className="clo2" onClick={playPause}>
                  {isPlaying ? <FaPause /> : <FaPlay />}
                </button>
                <button onClick={nextSong}>&raquo;</button>
                <button
                  className="clo3"
                  onClick={toggleMute}
                  onMouseEnter={() => setIsVolumeControlActive(true)}
                  onMouseLeave={() => setIsVolumeControlActive(false)}
                >
                  {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
