import { View } from '@/components/Themed';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useArtistStore } from '@/lib/actions/artists';
import { router } from 'expo-router';
import { AlertCircle, AlertCircleIcon, ArrowLeft, Search, Users, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';


export default function ArtistsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const { 
    artists, 
    searchResults, 
    pagination, 
    isLoading, 
    error, 
    fetchArtists, 
    searchArtists,
    clearSearchResults,
    clearError 
  } = useArtistStore();

  useEffect(() => {
    // Fetch artists on mount
    fetchArtists();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const timer = setTimeout(() => {
        setIsSearchMode(true);
        searchArtists(searchQuery);
      }, 500);
      
      return () => clearTimeout(timer);
    }
    setIsSearchMode(false);
    clearSearchResults();
  }, [searchQuery]);

  const displayArtists = isSearchMode ? searchResults : artists;

  const handleArtistPress = (artistId: string) => {
    router.push(`/artist-detail?id=${artistId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLoadMore = () => {
    if (!isSearchMode && pagination && pagination.page * pagination.limit < pagination.total) {
      fetchArtists(pagination.page + 1, pagination.limit);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    clearSearchResults();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{backgroundColor:"transparent"}} className="flex-row items-center justify-between p-4 pb-2">
        <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3">
          <Button variant="ghost" size="sm" onPress={() => router.back()}>
            <ArrowLeft size={24} />
          </Button>
          <Users size={32} className="text-primary" />
          <Text className="text-3xl font-bold">Artists</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Error Alert */}
        {error && (
          <Alert icon={AlertCircleIcon} variant="destructive" className="mb-4">
            <AlertCircle size={20} />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2">
              <Search size={20} className="opacity-50" />
              <Input
                placeholder="Search artists by name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1"
              />
              {searchQuery.length > 0 && (
                <Button variant="ghost" size="sm" onPress={handleClearSearch}>
                  <X size={20} />
                </Button>
              )}
            </View>
            {isSearchMode && (
              <Text className="text-xs opacity-70 mt-2">
                Searching for "{searchQuery}"...
              </Text>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        {!isLoading && !isSearchMode && pagination && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Overall artist metrics</CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              <View style={{backgroundColor:"transparent"}} className="flex-row justify-between">
                <View style={{backgroundColor:"transparent"}} className="flex-1">
                  <Text className="text-sm opacity-70 mb-1">Total Artists</Text>
                  <Text className="text-2xl font-bold">{pagination.total}</Text>
                </View>
                <View style={{backgroundColor:"transparent"}} className="flex-1">
                  <Text className="text-sm opacity-70 mb-1">Page</Text>
                  <Text className="text-2xl font-bold">{pagination.page}</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Search Results Info */}
        {isSearchMode && !isLoading && searchResults.length > 0 && (
          <Card className="mb-4">
            <CardContent className="py-3">
              <Text className="text-sm opacity-70">
                Found {searchResults.length} artist{searchResults.length !== 1 ? 's' : ''} matching "{searchQuery}"
              </Text>
            </CardContent>
          </Card>
        )}

        {/* Loading Skeletons */}
        {isLoading && displayArtists.length === 0 && (
          <View style={{backgroundColor:"transparent"}} className="gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </View>
        )}

        {/* Artist List */}
        {!isLoading && displayArtists.length > 0 && (
          <View style={{backgroundColor:"transparent"}} className="gap-3">
            <Text className="text-xl font-semibold mb-2">
              {isSearchMode ? 'Search Results' : 'All Artists'}
            </Text>
            {displayArtists.map((artist) => (
              <Pressable key={artist.id} onPress={() => handleArtistPress(artist.id)}>
                <Card>
                  <CardContent className="py-3">
                    <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-3">
                      <Avatar alt={artist.name} className="w-16 h-16">
                        {artist.avatarUrl ? (
                          <AvatarImage source={{ uri: artist.avatarUrl }} />
                        ) : null}
                        <AvatarFallback>
                          <Text className="text-lg">{getInitials(artist.name)}</Text>
                        </AvatarFallback>
                      </Avatar>
                      
                      <View style={{backgroundColor:"transparent"}} className="flex-1">
                        <View style={{backgroundColor:"transparent"}} className="flex-row items-center gap-2 mb-1">
                          <Text className="font-bold text-lg">{artist.name}</Text>
                          {artist.verified && (
                            <Badge variant="default" className="self-start">
                              <Text className="text-xs">✓ Verified</Text>
                            </Badge>
                          )}
                        </View>
                        {artist.bio && (
                          <Text className="text-sm opacity-70" numberOfLines={2}>
                            {artist.bio}
                          </Text>
                        )}
                        <Text className="text-xs opacity-50 mt-1">{artist.email}</Text>
                      </View>

                      <View style={{backgroundColor:"transparent"}} className="items-end">
                        <Users size={20} className="text-primary" />
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </Pressable>
            ))}

            {/* Load More Button - Only show in browse mode */}
            {!isSearchMode && pagination && pagination.page * pagination.limit < pagination.total && (
              <Button 
                variant="outline" 
                onPress={handleLoadMore}
                disabled={isLoading}
                className="mt-4">
                <Text>{isLoading ? 'Loading...' : 'Load More'}</Text>
              </Button>
            )}
          </View>
        )}

        {displayArtists.length === 0 && !isLoading && (
          <Card className="mt-8">
            <CardContent className="py-8 items-center">
              <Text className="text-center opacity-70">
                {searchQuery ? 'No artists found matching your search' : 'No artists available'}
              </Text>
            </CardContent>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 8,
  },
});
