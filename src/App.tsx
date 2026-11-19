/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BUNDLED_TRACK_REGISTRY } from './audio/bundledAudioRegistry';
import { soundEngine, type MusicPlaybackSnapshot } from './audio/soundEngine';
import {
  bundleUserTracksLocally,
  clearOfflinePlaylist,
  deleteOfflineTrack,
  deleteSongOverride,
  getOfflinePlaylist,
  getSongOverrideMetas,
  saveSongOverrideLocally,
} from './audio/trackBundler';
import { CharactersModal } from './components/CharactersModal';
import { CreditsModal } from './components/CreditsModal';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { GarageModal } from './components/GarageModal';
import { IntroOverlay } from './components/IntroOverlay';
import { MainMenu } from './components/MainMenu';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PauseModal } from './components/PauseModal';
import { RecordsModal } from './components/RecordsModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { TestAdModal } from './components/TestAdModal';
import { RutaCatrachaEngine, type RunSummary } from './game/RutaCatrachaEngine';
import type { OfflineTrackMeta, SongOverrideMeta } from './services/customAudioStorage';
import { requestPersistentAudioStorage } from './services/customAudioStorage';
import { monetizationService, type AdPlacement } from './services/monetization';
import { loadProgress, resetProgress, saveProgress } from './services/storage';
import {
  GAME_CONSTANTS,
  type AccessoryId,
  type BackpackId,
  type CharacterId,
  type CityId,
  type GameSettings,
  type HatId,
  type HudState,
  type InputAction,
  type MenuModalId,
  type OutfitId,
  type PlayerProgress,
  type ShoeId,
} from './types/game';

const INITIAL_HUD: HudState = {
  phase: 'menu',
  city: 'tegucigalpa',
  score: 0,
  highScore: 0,
  distance: 0,
  runCoins: 0,
  lives: GAME_CONSTANTS.MAX_LIVES,
  maxLives: GAME_CONSTANTS.MAX_LIVES,
  speedKmh: Math.round(GAME_CONSTANTS.BASE_SPEED * 3.1),
  onVehicleRoof: false,
  feedbackText: null,
  feedbackTone: null,
  feedbackSeq: 0,
  introCaption: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RutaCatrachaEngine | null>(null);

  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [hud, setHud] = useState<HudState>(() => ({
    ...INITIAL_HUD,
    city: progress.selectedCity,
    highScore: progress.highScore,
  }));
  const phaseRef = useRef(hud.phase);
  phaseRef.current = hud.phase;

  const [activeModal, setActiveModal] = useState<MenuModalId>('none');
  const [muted, setMuted] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [activeAd, setActiveAd] = useState<AdPlacement | null>(null);
  const [rewardClaimedThisRun, setRewardClaimedThisRun] = useState(false);
  const [playlist, setPlaylist] = useState<OfflineTrackMeta[]>([]);
  const [songOverrides, setSongOverrides] = useState<Record<string, SongOverrideMeta>>({});
  const [playback, setPlayback] = useState<MusicPlaybackSnapshot>(() =>
    soundEngine.getPlaybackSnapshot(),
  );
  const [bundledAssetName, setBundledAssetName] = useState<string | null>(() =>
    BUNDLED_TRACK_REGISTRY.todas_las_noches_estuvo.bundled
      ? BUNDLED_TRACK_REGISTRY.todas_las_noches_estuvo.fileName
      : null,
  );
  const [trackUploadError, setTrackUploadError] = useState<string | null>(null);

  const touchStartRef = useRef<{ x: number; y: number; handled: boolean } | null>(null);

  const updateProgress = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  // Unlock Web Audio across mobile/desktop interactions until AudioContext is running
  useEffect(() => {
    const unlockAudio = () => {
      soundEngine.unlock();
      if (soundEngine.isContextRunning()) {
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('touchend', unlockAudio);
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      }
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('touchend', unlockAudio);
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchend', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Subscribe to soundEngine transport state & synchronize style changes (e.g., Next/Prev cycling)
  useEffect(() => {
    const unsub = soundEngine.subscribePlaybackState(setPlayback);
    soundEngine.setStyleChangeHandler((nextStyle) => {
      updateProgress((prev) =>
        prev.settings.musicStyle === nextStyle
          ? prev
          : { ...prev, settings: { ...prev.settings, musicStyle: nextStyle } },
      );
    });
    return () => {
      unsub();
      soundEngine.setStyleChangeHandler(null);
    };
  }, [updateProgress]);

  // Load persisted offline multi-song playlist & per-song overrides (IndexedDB) + bundled asset
  useEffect(() => {
    let active = true;
    void requestPersistentAudioStorage();
    void (async () => {
      const [metas, overrideMetas] = await Promise.all([
        getOfflinePlaylist(),
        getSongOverrideMetas(),
      ]);
      if (!active) return;
      setPlaylist(metas);
      soundEngine.setPlaylistMetas(metas);
      setSongOverrides(overrideMetas);
      soundEngine.setSongOverrideMetas(overrideMetas);

      const loadedStatic = await soundEngine.ensureBundledTrackLoaded();
      if (active && loadedStatic) {
        setBundledAssetName(
          BUNDLED_TRACK_REGISTRY.todas_las_noches_estuvo.fileName ?? 'todas_las_noches_estuvo.mp3',
        );
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Sync audio settings with soundEngine
  useEffect(() => {
    soundEngine.setVolumes(
      progress.settings.musicVolume,
      progress.settings.sfxVolume,
      progress.settings.ambientVolume,
      progress.settings.vehicleVolume,
    );
    soundEngine.setMusicStyle(progress.settings.musicStyle);
  }, [
    progress.settings.musicVolume,
    progress.settings.sfxVolume,
    progress.settings.ambientVolume,
    progress.settings.vehicleVolume,
    progress.settings.musicStyle,
  ]);

  // Sync dynamic music context
  useEffect(() => {
    if (hud.phase === 'menu') {
      soundEngine.setMusicContext(
        activeModal === 'shop' || activeModal === 'garage' ? 'shop' : 'menu',
      );
    }
  }, [hud.phase, activeModal]);

  // Mount Three.js engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const initial = progressRef.current;
    const engine = new RutaCatrachaEngine(
      mount,
      {
        characterId: initial.equippedCharacter,
        outfitId: initial.equippedOutfit,
        shoeId: initial.equippedShoes,
        hatId: initial.equippedHat,
        backpackId: initial.equippedBackpack,
        accessoryId: initial.equippedAccessory,
      },
      initial.selectedCity,
      initial.highScore,
      initial.settings.quality,
      {
        onHudUpdate: (nextHud) => {
          phaseRef.current = nextHud.phase;
          setHud(nextHud);
        },
        onRunComplete: (summary: RunSummary) => {
          const cur = progressRef.current;
          const nextHigh = Math.max(cur.highScore, summary.score);
          const nextBestDist = Math.max(cur.bestDistance, summary.distance);
          const prevCityBest = cur.cityBestScores[summary.city] ?? 0;

          const nextProg: PlayerProgress = {
            ...cur,
            coinsWallet: cur.coinsWallet + summary.coins,
            totalCoinsCollected: cur.totalCoinsCollected + summary.coins,
            highScore: nextHigh,
            bestDistance: nextBestDist,
            totalRuns: cur.totalRuns + 1,
            cityBestScores: {
              ...cur.cityBestScores,
              [summary.city]: Math.max(prevCityBest, summary.score),
            },
          };
          saveProgress(nextProg);
          setProgress(nextProg);
          engine.setHighScore(nextHigh);

          if (monetizationService.shouldShowInterstitialOnGameOver(cur.adsRemoved)) {
            setActiveAd('interstitial_gameover');
          }
        },
        onIntroComplete: () => {
          updateProgress((prev) => ({ ...prev, hasSeenIntro: true }));
        },
        onContextLostChange: (lost) => setContextLost(lost),
      },
    );
    engineRef.current = engine;

    // Automatic first-launch cinematic story (Steps A -> I)
    if (!initial.hasSeenIntro) {
      engine.startIntro();
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [updateProgress]);

  // Sync 3D character appearance when customized
  useEffect(() => {
    engineRef.current?.setCharacterAppearance({
      characterId: progress.equippedCharacter,
      outfitId: progress.equippedOutfit,
      shoeId: progress.equippedShoes,
      hatId: progress.equippedHat,
      backpackId: progress.equippedBackpack,
      accessoryId: progress.equippedAccessory,
    });
  }, [
    progress.equippedCharacter,
    progress.equippedOutfit,
    progress.equippedShoes,
    progress.equippedHat,
    progress.equippedBackpack,
    progress.equippedAccessory,
  ]);

  // Sync active city world when changed in menu/garage
  useEffect(() => {
    if (phaseRef.current === 'menu') {
      engineRef.current?.setCity(progress.selectedCity);
    }
  }, [progress.selectedCity]);

  useEffect(() => {
    engineRef.current?.applyQualitySettings(progress.settings.quality);
  }, [progress.settings.quality]);

  const dispatchAction = useCallback((action: InputAction) => {
    engineRef.current?.handleInput(action);
  }, []);

  const handlePlay = useCallback(() => {
    soundEngine.playButton();
    setActiveModal('none');
    setRewardClaimedThisRun(false);
    engineRef.current?.setCity(progressRef.current.selectedCity);
    engineRef.current?.startGame(false);
  }, []);

  const handleSkipIntro = useCallback(() => {
    soundEngine.playButton();
    engineRef.current?.skipIntro();
  }, []);

  const handleRestart = useCallback(() => {
    soundEngine.playButton();
    setRewardClaimedThisRun(false);
    engineRef.current?.setCity(progressRef.current.selectedCity);
    engineRef.current?.startGame(false);
  }, []);

  const handlePause = useCallback(() => {
    soundEngine.playButton();
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    soundEngine.playButton();
    engineRef.current?.resumeGame();
  }, []);

  const handleReturnToMenu = useCallback(() => {
    soundEngine.playButton();
    engineRef.current?.returnToMenu();
    engineRef.current?.setCity(progressRef.current.selectedCity);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      if (!next && (phaseRef.current === 'playing' || phaseRef.current === 'intro')) {
        soundEngine.startMusic(phaseRef.current === 'intro' ? 'chase' : 'run');
      }
      return next;
    });
  }, []);

  const handleTogglePlayPause = useCallback(() => {
    soundEngine.unlock();
    soundEngine.toggleMusicPlayback();
  }, []);

  const handlePrevTrack = useCallback(() => {
    soundEngine.unlock();
    void soundEngine.prevTrack();
  }, []);

  const handleNextTrack = useCallback(() => {
    soundEngine.unlock();
    void soundEngine.nextTrack();
  }, []);

  // Cities, Characters & Gear handlers
  const handleSelectCity = useCallback(
    (id: CityId) => {
      soundEngine.playButton();
      updateProgress((prev) => {
        if (!prev.unlockedCities.includes(id)) return prev;
        return { ...prev, selectedCity: id };
      });
    },
    [updateProgress],
  );

  const handleUnlockCity = useCallback(
    (id: CityId, price: number) => {
      soundEngine.playCelebrate();
      updateProgress((prev) => {
        if (prev.coinsWallet < price || prev.unlockedCities.includes(id)) return prev;
        return {
          ...prev,
          coinsWallet: prev.coinsWallet - price,
          unlockedCities: [...prev.unlockedCities, id],
          selectedCity: id,
        };
      });
    },
    [updateProgress],
  );

  const handleBuyCharacter = useCallback(
    (id: CharacterId, price: number) => {
      soundEngine.playCelebrate();
      updateProgress((prev) => {
        if (prev.coinsWallet < price || prev.unlockedCharacters.includes(id)) return prev;
        return {
          ...prev,
          coinsWallet: prev.coinsWallet - price,
          unlockedCharacters: [...prev.unlockedCharacters, id],
          equippedCharacter: id,
        };
      });
    },
    [updateProgress],
  );

  const handleEquipCharacter = useCallback(
    (id: CharacterId) => {
      soundEngine.playButton();
      updateProgress((prev) => ({
        ...prev,
        equippedCharacter: id,
      }));
    },
    [updateProgress],
  );

  const handleBuyOutfit = useCallback(
    (id: OutfitId, price: number) => {
      soundEngine.playCoin();
      updateProgress((prev) => {
        if (prev.coinsWallet < price || prev.unlockedOutfits.includes(id)) return prev;
        return {
          ...prev,
          coinsWallet: prev.coinsWallet - price,
          unlockedOutfits: [...prev.unlockedOutfits, id],
          equippedCharacter: 'protagonist',
          equippedOutfit: id,
        };
      });
    },
    [updateProgress],
  );

  const handleEquipOutfit = useCallback(
    (id: OutfitId) => {
      soundEngine.playButton();
      updateProgress((prev) => ({
        ...prev,
        equippedCharacter: 'protagonist',
        equippedOutfit: id,
      }));
    },
    [updateProgress],
  );

  const handleBuyShoes = useCallback(
    (id: ShoeId, price: number) => {
      soundEngine.playCoin();
      updateProgress((prev) => {
        if (prev.coinsWallet < price || prev.unlockedShoes.includes(id)) return prev;
        return {
          ...prev,
          coinsWallet: prev.coinsWallet - price,
          unlockedShoes: [...prev.unlockedShoes, id],
          equippedCharacter: 'protagonist',
          equippedShoes: id,
        };
      });
    },
    [updateProgress],
  );

  const handleEquipShoes = useCallback(
    (id: ShoeId) => {
      soundEngine.playButton();
      updateProgress((prev) => ({
        ...prev,
        equippedCharacter: 'protagonist',
        equippedShoes: id,
      }));
    },
    [updateProgress],
  );

  const handleBuyHat = useCallback(
    (id: HatId, price: number) => {
      soundEngine.playCoin();
      updateProgress((prev) => {
        if (prev.coinsWallet < price || prev.unlockedHats.includes(id)) return prev;
        return {
          ...prev,
          coinsWallet: prev.coinsWallet - price,
          unlockedHats: [...prev.unlockedHats, id],
          equippedCharacter: 'protagonist',
          equippedHat: id,
        };
      });
    },
    [updateProgress],
  );

  const handleEquipHat = useCallback(
    (id: HatId) => {
      soundEngine.playButton();
      updateProgress((prev) => ({
        ...prev,
        equippedCharacter: 'protagonist',
        equippedHat: id,
      }));
    },
    [updateProgress],
  );

  const handleBuyBackpack = useCallback(
    (id: BackpackId, price: number) => {
      soundEngine.playCoin();
      updateProgress((prev) => {
        if (prev.coinsWallet < price || prev.unlockedBackpacks.includes(id)) return prev;
        return {
          ...prev,
          coinsWallet: prev.coinsWallet - price,
          unlockedBackpacks: [...prev.unlockedBackpacks, id],
          equippedCharacter: 'protagonist',
          equippedBackpack: id,
        };
      });
    },
    [updateProgress],
  );

  const handleEquipBackpack = useCallback(
    (id: BackpackId) => {
      soundEngine.playButton();
      updateProgress((prev) => ({
        ...prev,
        equippedCharacter: 'protagonist',
        equippedBackpack: id,
      }));
    },
    [updateProgress],
  );

  const handleBuyAccessory = useCallback(
    (id: AccessoryId, price: number) => {
      soundEngine.playCoin();
      updateProgress((prev) => {
        if (prev.coinsWallet < price || prev.unlockedAccessories.includes(id)) return prev;
        return {
          ...prev,
          coinsWallet: prev.coinsWallet - price,
          unlockedAccessories: [...prev.unlockedAccessories, id],
          equippedAccessory: id,
        };
      });
    },
    [updateProgress],
  );

  const handleEquipAccessory = useCallback(
    (id: AccessoryId) => {
      soundEngine.playButton();
      updateProgress((prev) => ({ ...prev, equippedAccessory: id }));
    },
    [updateProgress],
  );

  const handleUpdateSettings = useCallback(
    (partial: Partial<GameSettings>) => {
      updateProgress((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...partial },
      }));
    },
    [updateProgress],
  );

  const handleResetProgress = useCallback(() => {
    soundEngine.playButton();
    const fresh = resetProgress();
    setProgress(fresh);
    setActiveModal('none');
    engineRef.current?.setHighScore(0);
    engineRef.current?.setCity('tegucigalpa');
  }, []);

  const handleUploadTracks = useCallback(
    async (files: File[]) => {
      setTrackUploadError(null);
      try {
        soundEngine.unlock();
        const { addedTracks, firstTrackData } = await bundleUserTracksLocally(files);
        const updatedMetas = await getOfflinePlaylist();
        setPlaylist(updatedMetas);

        const targetId = addedTracks[0]?.id;
        soundEngine.setPlaylistMetas(updatedMetas, targetId);

        if (firstTrackData) {
          const decoded = await soundEngine.cacheDecodedTrackBuffer(
            firstTrackData.id,
            firstTrackData.data,
            firstTrackData.mimeType,
          );
          if (!decoded) {
            setTrackUploadError('Una canción no se pudo decodificar en este dispositivo.');
          }
        }

        updateProgress((prev) => ({
          ...prev,
          settings: { ...prev.settings, musicStyle: 'mi_musica' },
        }));
        if (targetId) {
          await soundEngine.selectPlaylistTrack(targetId);
        }
      } catch (err) {
        setTrackUploadError(
          err instanceof Error ? err.message : 'No se pudieron guardar los archivos de audio.',
        );
      }
    },
    [updateProgress],
  );

  const handleSelectTrack = useCallback((trackId: string) => {
    soundEngine.unlock();
    void soundEngine.selectPlaylistTrack(trackId);
  }, []);

  const handleDeleteTrack = useCallback(async (trackId: string) => {
    setTrackUploadError(null);
    await deleteOfflineTrack(trackId);
    const updatedMetas = await getOfflinePlaylist();
    setPlaylist(updatedMetas);
    soundEngine.setPlaylistMetas(updatedMetas);
  }, []);

  const handleClearPlaylist = useCallback(async () => {
    setTrackUploadError(null);
    await clearOfflinePlaylist();
    setPlaylist([]);
    soundEngine.setPlaylistMetas([]);
  }, []);

  const handleUploadSongOverride = useCallback(
    async (songId: string, file: File) => {
      setTrackUploadError(null);
      try {
        soundEngine.unlock();
        const saved = await saveSongOverrideLocally(songId, file);
        const updatedMetas = await getSongOverrideMetas();
        setSongOverrides(updatedMetas);
        soundEngine.setSongOverrideMetas(updatedMetas);
        const decoded = await soundEngine.cacheDecodedSongOverride(
          songId,
          saved.data,
          saved.mimeType,
        );
        if (!decoded) {
          setTrackUploadError('El archivo de audio no se pudo decodificar en este dispositivo.');
        }
        const styleId = songId as PlayerProgress['settings']['musicStyle'];
        soundEngine.setMusicStyle(styleId);
        soundEngine.forceRestartCurrentMusic();
        updateProgress((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            musicStyle: styleId,
          },
        }));
      } catch (err) {
        setTrackUploadError(
          err instanceof Error ? err.message : 'No se pudo guardar la pista seleccionada.',
        );
      }
    },
    [updateProgress],
  );

  const handleDeleteSongOverride = useCallback(async (songId: string) => {
    setTrackUploadError(null);
    await deleteSongOverride(songId);
    const updatedMetas = await getSongOverrideMetas();
    setSongOverrides(updatedMetas);
    soundEngine.setSongOverrideMetas(updatedMetas);
  }, []);

  const handleApplyBillingSku = useCallback(
    (sku: string) => {
      soundEngine.playCelebrate();
      updateProgress((prev) => {
        if (sku === 'rc_coins_pack_500') {
          return { ...prev, coinsWallet: prev.coinsWallet + 500 };
        }
        if (sku === 'rc_coins_pack_2000') {
          return { ...prev, coinsWallet: prev.coinsWallet + 2000 };
        }
        if (sku === 'rc_remove_ads') {
          return { ...prev, adsRemoved: true };
        }
        return prev;
      });
    },
    [updateProgress],
  );

  const handleTriggerRewardedAd = useCallback(
    async (placement: 'rewarded_coins' | 'rewarded_run_bonus') => {
      soundEngine.playButton();
      if (!monetizationService.isOnline()) return;

      if (window.RutaCatrachaNativeAdMob) {
        try {
          const res = await window.RutaCatrachaNativeAdMob.showRewarded(
            'ca-app-pub-3940256099942544/5224354917',
          );
          if (res.rewarded) {
            if (placement === 'rewarded_coins') {
              soundEngine.playCelebrate();
              updateProgress((prev) => ({ ...prev, coinsWallet: prev.coinsWallet + 100 }));
            } else {
              soundEngine.playCoin();
              setRewardClaimedThisRun(true);
              updateProgress((prev) => ({ ...prev, coinsWallet: prev.coinsWallet + 50 }));
            }
          }
          return;
        } catch {
          // Fallback to test ad modal in development
        }
      }

      setActiveAd(placement);
    },
    [updateProgress],
  );

  const handleAdComplete = useCallback(
    (rewarded: boolean) => {
      const placement = activeAd;
      setActiveAd(null);
      if (!rewarded || !placement) return;

      if (placement === 'rewarded_coins') {
        soundEngine.playCelebrate();
        updateProgress((prev) => ({ ...prev, coinsWallet: prev.coinsWallet + 100 }));
      } else if (placement === 'rewarded_run_bonus') {
        soundEngine.playCoin();
        setRewardClaimedThisRun(true);
        updateProgress((prev) => ({ ...prev, coinsWallet: prev.coinsWallet + 50 }));
      }
    },
    [activeAd, updateProgress],
  );

  // Windows / Desktop Keyboard Controls (supports arrows, wasd, or both)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const phase = phaseRef.current;

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (phase === 'playing') {
          e.preventDefault();
          engineRef.current?.pauseGame();
        } else if (phase === 'paused') {
          e.preventDefault();
          engineRef.current?.resumeGame();
        }
        return;
      }

      if (phase !== 'playing') return;

      const scheme = progressRef.current.settings.controlScheme;
      const allowArrows = scheme === 'both' || scheme === 'arrows';
      const allowWasd = scheme === 'both' || scheme === 'wasd';

      if ((allowArrows && e.key === 'ArrowLeft') || (allowWasd && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        dispatchAction('left');
      } else if (
        (allowArrows && e.key === 'ArrowRight') ||
        (allowWasd && (e.key === 'd' || e.key === 'D'))
      ) {
        e.preventDefault();
        dispatchAction('right');
      } else if (
        (allowArrows && e.key === 'ArrowUp') ||
        (allowWasd && (e.key === 'w' || e.key === 'W')) ||
        e.key === ' '
      ) {
        e.preventDefault();
        dispatchAction('jump');
      } else if (
        (allowArrows && e.key === 'ArrowDown') ||
        (allowWasd && (e.key === 's' || e.key === 'S'))
      ) {
        e.preventDefault();
        dispatchAction('duck');
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatchAction]);

  // Android / Mobile Touch Swipe Controls
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    soundEngine.unlock();
    if (phaseRef.current !== 'playing') return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    if (e.touches.length > 0) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, handled: false };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (phaseRef.current !== 'playing') return;
      const start = touchStartRef.current;
      if (!start || start.handled || e.touches.length === 0) return;

      const t = e.touches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const threshold = Math.max(14, Math.round(28 / progressRef.current.settings.touchSensitivity));

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      start.handled = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        dispatchAction(dx < 0 ? 'left' : 'right');
      } else {
        dispatchAction(dy < 0 ? 'jump' : 'duck');
      }
    },
    [dispatchAction],
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  return (
    <main
      className="relative w-full h-full overflow-hidden bg-[#070d16] select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Isolated WebGL Canvas */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {contextLost && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#070d16]/95 p-6 text-center">
          <div className="max-w-sm rounded-2xl bg-white/5 border border-white/15 p-6">
            <h2 className="font-display text-xl font-bold text-white">Gráficos 3D Pausados</h2>
            <p className="mt-2 text-sm text-slate-300">
              El contexto WebGL se reinició temporalmente. Recarga la página si no se restablece automáticamente.
            </p>
          </div>
        </div>
      )}

      {hud.phase === 'menu' && activeModal === 'none' && (
        <MainMenu
          progress={progress}
          muted={muted}
          playback={playback}
          onToggleMute={handleToggleMute}
          onTogglePlayPause={handleTogglePlayPause}
          onPrevTrack={handlePrevTrack}
          onNextTrack={handleNextTrack}
          onChangeMusicVolume={(vol) => handleUpdateSettings({ musicVolume: vol })}
          onUploadQuickTracks={(files) => void handleUploadTracks(files)}
          onPlay={handlePlay}
          onOpenModal={(m) => {
            soundEngine.playButton();
            setActiveModal(m);
          }}
        />
      )}

      {hud.phase === 'menu' && activeModal === 'characters' && (
        <CharactersModal
          progress={progress}
          onClose={() => {
            soundEngine.playButton();
            setActiveModal('none');
          }}
          onEquipCharacter={handleEquipCharacter}
          onCelebratePreview={() => engineRef.current?.triggerCelebration(1.8)}
          onUploadPhoto={(dataUrl) => updateProgress((prev) => ({ ...prev, customPhotoDataUrl: dataUrl }))}
          onOpenShop={() => {
            soundEngine.playButton();
            setActiveModal('shop');
          }}
        />
      )}

      {hud.phase === 'menu' && activeModal === 'shop' && (
        <ShopModal
          progress={progress}
          onClose={() => {
            soundEngine.playButton();
            setActiveModal('none');
          }}
          onBuyCharacter={handleBuyCharacter}
          onEquipCharacter={handleEquipCharacter}
          onBuyOutfit={handleBuyOutfit}
          onEquipOutfit={handleEquipOutfit}
          onBuyShoes={handleBuyShoes}
          onEquipShoes={handleEquipShoes}
          onBuyHat={handleBuyHat}
          onEquipHat={handleEquipHat}
          onBuyBackpack={handleBuyBackpack}
          onEquipBackpack={handleEquipBackpack}
          onBuyAccessory={handleBuyAccessory}
          onEquipAccessory={handleEquipAccessory}
          onApplyBillingSku={handleApplyBillingSku}
          onWatchRewardedAd={() => void handleTriggerRewardedAd('rewarded_coins')}
        />
      )}

      {hud.phase === 'menu' && activeModal === 'garage' && (
        <GarageModal
          progress={progress}
          onClose={() => {
            soundEngine.playButton();
            setActiveModal('none');
          }}
          onSelectCity={handleSelectCity}
          onUnlockCity={handleUnlockCity}
          onEquipOutfit={handleEquipOutfit}
          onEquipShoes={handleEquipShoes}
          onEquipHat={handleEquipHat}
          onEquipBackpack={handleEquipBackpack}
          onEquipAccessory={handleEquipAccessory}
          onCelebratePreview={() => engineRef.current?.triggerCelebration(1.8)}
          onOpenShop={() => {
            soundEngine.playButton();
            setActiveModal('shop');
          }}
        />
      )}

      {hud.phase === 'menu' && activeModal === 'settings' && (
        <SettingsModal
          settings={progress.settings}
          playlist={playlist}
          songOverrides={songOverrides}
          playback={playback}
          muted={muted}
          bundledAssetName={bundledAssetName}
          trackUploadError={trackUploadError}
          onUploadTracks={(files) => void handleUploadTracks(files)}
          onUploadSongOverride={(songId, file) => void handleUploadSongOverride(songId, file)}
          onDeleteSongOverride={(songId) => void handleDeleteSongOverride(songId)}
          onSelectTrack={handleSelectTrack}
          onDeleteTrack={(id) => void handleDeleteTrack(id)}
          onClearPlaylist={() => void handleClearPlaylist()}
          onTogglePlayPause={handleTogglePlayPause}
          onPrevTrack={handlePrevTrack}
          onNextTrack={handleNextTrack}
          onToggleMute={handleToggleMute}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onClose={() => {
            soundEngine.playButton();
            setActiveModal('none');
          }}
        />
      )}

      {hud.phase === 'menu' && activeModal === 'records' && (
        <RecordsModal
          progress={progress}
          onClose={() => {
            soundEngine.playButton();
            setActiveModal('none');
          }}
        />
      )}

      {hud.phase === 'menu' && activeModal === 'credits' && (
        <CreditsModal
          onClose={() => {
            soundEngine.playButton();
            setActiveModal('none');
          }}
        />
      )}

      {hud.phase === 'intro' && (
        <IntroOverlay caption={hud.introCaption} onSkip={handleSkipIntro} />
      )}

      {hud.phase === 'playing' && (
        <GameHUD
          hud={hud}
          muted={muted}
          playback={playback}
          musicVolume={progress.settings.musicVolume}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onTogglePlayPause={handleTogglePlayPause}
          onPrevTrack={handlePrevTrack}
          onNextTrack={handleNextTrack}
          onChangeMusicVolume={(vol) => handleUpdateSettings({ musicVolume: vol })}
        />
      )}

      {hud.phase === 'paused' && (
        <>
          <GameHUD
            hud={hud}
            muted={muted}
            playback={playback}
            musicVolume={progress.settings.musicVolume}
            onToggleMute={handleToggleMute}
            onPause={handleResume}
            onTogglePlayPause={handleTogglePlayPause}
            onPrevTrack={handlePrevTrack}
            onNextTrack={handleNextTrack}
            onChangeMusicVolume={(vol) => handleUpdateSettings({ musicVolume: vol })}
          />
          <PauseModal
            city={hud.city}
            playback={playback}
            musicVolume={progress.settings.musicVolume}
            muted={muted}
            onResume={handleResume}
            onRestart={handleRestart}
            onMenu={handleReturnToMenu}
            onTogglePlayPause={handleTogglePlayPause}
            onPrevTrack={handlePrevTrack}
            onNextTrack={handleNextTrack}
            onChangeMusicVolume={(vol) => handleUpdateSettings({ musicVolume: vol })}
            onToggleMute={handleToggleMute}
          />
        </>
      )}

      {hud.phase === 'gameover' && (
        <GameOverModal
          hud={hud}
          walletTotal={progress.coinsWallet}
          onRestart={handleRestart}
          onMenu={handleReturnToMenu}
          onWatchRewardedAd={() => void handleTriggerRewardedAd('rewarded_run_bonus')}
          rewardClaimedThisRun={rewardClaimedThisRun}
        />
      )}

      {activeAd && <TestAdModal placement={activeAd} onComplete={handleAdComplete} />}
      <OfflineIndicator />
    </main>
  );
}
