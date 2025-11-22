import { View } from '@/components/Themed';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useTrackStore } from '@/lib/actions/tracks';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  Heart,
  Music,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  User
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

export default function PlayingSongScreen() {
  const { id } = useLocalSearchParams();
  const { currentTrack, isLoading, error, fetchTrackById, clearCurrentTrack } = useTrackStore();
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(33);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTrackById(id as string);
    }
    
    return () => {
      clearCurrentTrack();
    };
  }, [id]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentTime = () => {
    if (!currentTrack?.duration) return '0:00';
    const currentSeconds = Math.floor((currentTrack.duration * progress) / 100);
    const mins = Math.floor(currentSeconds / 60);
    const secs = currentSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between p-4">
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          <ArrowLeft size={24} />
        </Button>
        <Text className="text-lg font-semibold">Now Playing</Text>
        <View style={{backgroundColor:"transparent"}} className="w-10" />
      </View>

      {/* Error Alert */}
      {error && (
        <View style={{backgroundColor:"transparent"}} className="px-4 pb-2">
          <Alert variant="destructive" icon={AlertCircle}>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </View>
      )}

      {/* Loading State */}
      {isLoading && (
        <View style={{backgroundColor:"transparent"}} className="flex-1 px-8">
          <Skeleton className="w-full aspect-square max-w-sm mx-auto mb-8" />
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-16 w-full" />
        </View>
      )}

      {/* Track Content */}
      {!isLoading && currentTrack && (
        <>
          {/* Album Art */}
          <View style={{backgroundColor:"transparent"}} className="items-center justify-center flex-1 px-8">
            <Card className="w-full aspect-square max-w-sm">
              <CardContent className="flex-1 items-center justify-center bg-primary/10">
                <Music size={120} className="text-primary opacity-50" />
                {currentTrack.explicit && (
                  <Badge variant="destructive" className="absolute top-4 right-4">
                    <Text>Explicit</Text>
                  </Badge>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Song Info */}
          <View style={{backgroundColor:"transparent"}} className="px-8 pb-4">
            <View style={{backgroundColor:"transparent"}} className="flex-row items-start justify-between mb-2">
              <View style={{backgroundColor:"transparent"}} className="flex-1 mr-4">
                <Text className="text-2xl font-bold mb-1">{currentTrack.title}</Text>
                <Text className="text-lg opacity-70 mb-1">{currentTrack.artist.name}</Text>
                {currentTrack.album ? (
                  <Text className="text-sm opacity-50">{currentTrack.album.title}</Text>
                ) : (
                  <Text className="text-sm opacity-50">Single</Text>
                )}
                {currentTrack.genre && (
                  <Badge variant="secondary" className="self-start mt-2">
                    <Text className="text-xs">{currentTrack.genre}</Text>
                  </Badge>
                )}
              </View>
              <Pressable onPress={() => setIsFavorite(!isFavorite)}>
                <Heart 
                  size={32} 
                  fill={isFavorite ? 'currentColor' : 'none'}
                  className={isFavorite ? 'text-destructive' : 'text-foreground'}
                />
              </Pressable>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={{backgroundColor:"transparent"}} className="px-8 pb-6">
            <Progress value={progress} className="mb-2" />
            <View style={{backgroundColor:"transparent"}} className="flex-row justify-between">
              <Text className="text-sm opacity-50">{getCurrentTime()}</Text>
              <Text className="text-sm opacity-50">{formatDuration(currentTrack.duration)}</Text>
            </View>
          </View>

          {/* Playback Controls */}
          <View style={{backgroundColor:"transparent"}} className="px-8 pb-8">
            <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-center gap-6 mb-4">
              <Pressable onPress={() => setIsShuffle(!isShuffle)}>
                <Shuffle size={24} className={isShuffle ? 'text-primary' : 'opacity-50'} />
              </Pressable>
              
              <Button variant="ghost" size="lg">
                <SkipBack size={32} />
              </Button>

              <Pressable onPress={() => setIsPlaying(!isPlaying)}>
                <View style={{backgroundColor:"transparent"}} className="w-16 h-16 rounded-full bg-primary items-center justify-center">
                  {isPlaying ? (
                    <Pause size={32} className="text-primary-foreground" />
                  ) : (
                    <Play size={32} className="text-primary-foreground" />
                  )}
                </View>
              </Pressable>

              <Button variant="ghost" size="lg">
                <SkipForward size={32} />
              </Button>
              
              <Pressable onPress={() => setIsRepeat(!isRepeat)}>
                <Repeat size={24} className={isRepeat ? 'text-primary' : 'opacity-50'} />
              </Pressable>
            </View>

            {/* Artist Info Card */}
            <Card className="mt-4">
              <CardContent className="py-3">
                <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3">
                  <View style={{backgroundColor:"transparent"}} className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center">
                    <User size={24} className="text-primary" />
                  </View>
                  <View style={{backgroundColor:"transparent"}} className="flex-1">
                    <Text className="text-sm opacity-70">Artist</Text>
                    <Text className="font-semibold">{currentTrack.artist.name}</Text>
                  </View>
                  {currentTrack.artist.verified && (
                    <Badge variant="default">
                      <Text className="text-xs">✓ Verified</Text>
                    </Badge>
                  )}
                </View>
              </CardContent>
            </Card>
          </View>
        </>
      )}

      {/* Not Found State */}
      {!isLoading && !currentTrack && !error && (
        <View style={{backgroundColor:"transparent"}} className="flex-1 items-center justify-center px-8">
          <AlertCircle size={64} className="opacity-30 mb-4" />
          <Text className="text-xl font-semibold mb-2">Track Not Found</Text>
          <Text className="text-center opacity-70 mb-6">
            The track you're looking for doesn't exist or has been removed.
          </Text>
          <Button onPress={() => router.back()}>
            <Text>Go Back</Text>
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
