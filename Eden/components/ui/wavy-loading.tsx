import {CircularWavyProgressIndicator, Column, Host} from "@expo/ui/jetpack-compose";
import {size} from "@expo/ui/jetpack-compose/modifiers";

const WavyLoading = ({ color, dimension }: { color?: string; dimension?: number }) => (
    <Host matchContents>
        <Column verticalArrangement={{ spacedBy: 16 }}>
            <CircularWavyProgressIndicator
                color={color}
                modifiers={dimension ? [size(dimension, dimension)] : undefined}
            />
        </Column>
    </Host>
);

export default WavyLoading;