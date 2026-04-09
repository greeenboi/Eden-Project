import Colors from "@/constants/Colors";
import type { Artist } from '@/lib/actions/artists';
import { Box, Column, FilledTonalIconButton, Host, Icon, RNHostView, Row, Surface, Text } from '@expo/ui/jetpack-compose';
import { Shapes, background, clip, fillMaxSize, fillMaxWidth, offset, paddingAll, size, zIndex } from '@expo/ui/jetpack-compose/modifiers';
import { Image } from 'expo-image';
import React from 'react';
import { useColorScheme } from 'react-native';

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

const ArtistProfile = ({ CurrentArtist, handlePlayArtist }: { CurrentArtist: Artist; handlePlayArtist: () => void }) => {
    const colorScheme = useColorScheme();
    const themeColors = colorScheme === "dark" ? Colors.dark : Colors.light;


    return (
        <Host matchContents>
            <Surface color={themeColors.card} modifiers={[fillMaxWidth(0.93), background(themeColors.background), clip(Shapes.RoundedCorner(24))]}>
                <Column
                    verticalArrangement={{ spacedBy: 0 }}
                    horizontalAlignment="center"
                    modifiers={[fillMaxWidth(), paddingAll(16)]}
                >
                    <Box modifiers={[size(320, 330)]}>
                        <Box modifiers={[size(300, 300), clip(Shapes.Material.Slanted), zIndex(10)]}>
                            {CurrentArtist.avatarUrl ? (
                                <RNHostView matchContents>
                                    <Image
                                        source={{ uri: CurrentArtist.avatarUrl }}
                                        style={{ width: '100%', height: 300 }}
                                        contentFit="cover"
                                    />
                                </RNHostView>
                            ) : (
                                <Box
                                    contentAlignment="center"
                                    modifiers={[fillMaxWidth(), size(300, 300), background(themeColors.muted)]}
                                >
                                    <Text
                                        color={themeColors.mutedForeground}
                                        style={{
                                            fontSize: 56,
                                            fontWeight: '700',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        {getInitials(CurrentArtist.name)}
                                    </Text>
                                </Box>
                            )}
                        </Box>

                        <Box
                            modifiers={[
                                zIndex(25),
                                offset(-14, 212),
                                clip(Shapes.RoundedCorner(12)),
                                background(themeColors.background),
                                paddingAll(10),
                            ]}
                        >
                            <Row horizontalArrangement={{ spacedBy: 6 }} verticalAlignment="center">
                                <Text
                                    color={themeColors.text}
                                    style={{
                                        typography: 'titleLarge',
                                        fontWeight: '800',
                                    }}
                                >
                                    {CurrentArtist.name}
                                </Text>
                                {CurrentArtist.verified ? (
                                    <Icon
                                        source={require('../../../../assets/icons/verified.xml')}
                                        size={18}
                                        tint={themeColors.success}
                                        contentDescription="Verification-Badge"
                                    />
                                ) : null}
                            </Row>
                        </Box>

                        <FilledTonalIconButton
                            onClick={handlePlayArtist}
                            colors={{
                                containerColor: themeColors.mutedForeground,
                                contentColor: themeColors.muted,
                            }}
                            modifiers={[zIndex(30), offset(200, 216), clip(Shapes.Circle), fillMaxSize(0.38)]}
                        >
                            <Icon 
                                source={require('../../../../assets/icons/play.xml')} 
                                size={48}
                                tint={themeColors.muted}
                            />
                        </FilledTonalIconButton>
                    </Box>
                </Column>
            </Surface>
        </Host>
    );
};

export default ArtistProfile;
