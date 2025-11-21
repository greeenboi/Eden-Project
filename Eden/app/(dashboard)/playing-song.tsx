import { StyleSheet, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from '@/components/Themed';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Shuffle,
  Heart,
  Music
} from 'lucide-react-native';

export default function PlayingSongScreen() {
  const { id } = useLocalSearchParams();
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(33);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  // Mock song data - replace with actual song based on id
  const currentSong = {
    id: id as string,
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    duration: '5:55',
    currentTime: '1:58',
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

      {/* Album Art */}
      <View style={{backgroundColor:"transparent"}} className="items-center justify-center flex-1 px-8">
        <Card className="w-full aspect-square max-w-sm">
          <CardContent className="flex-1 items-center justify-center">
            <Music size={120} className="text-primary opacity-50" />
          </CardContent>
        </Card>
      </View>

      {/* Song Info */}
      <View style={{backgroundColor:"transparent"}} className="px-8 pb-4">
        <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between mb-2">
          <View style={{backgroundColor:"transparent"}} className="flex-1">
            <Text className="text-2xl font-bold">{currentSong.title}</Text>
            <Text className="text-lg opacity-70">{currentSong.artist}</Text>
            <Text className="text-sm opacity-50">{currentSong.album}</Text>
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
          <Text className="text-sm opacity-50">{currentSong.currentTime}</Text>
          <Text className="text-sm opacity-50">{currentSong.duration}</Text>
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
                <Play size={32} className="text-primary-foreground ml-1" />
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
