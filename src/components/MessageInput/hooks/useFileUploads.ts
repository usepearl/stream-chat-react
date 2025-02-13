import { useCallback, useEffect } from 'react';

import type { MessageInputReducerAction, MessageInputState } from './useMessageInputState';
import type { MessageInputProps } from '../MessageInput';
import { useChannelStateContext } from '../../../context/ChannelStateContext';

import type {
  CustomTrigger,
  DefaultAttachmentType,
  DefaultChannelType,
  DefaultCommandType,
  DefaultEventType,
  DefaultMessageType,
  DefaultReactionType,
  DefaultUserType,
} from '../../../types/types';

export const useFileUploads = <
  At extends DefaultAttachmentType = DefaultAttachmentType,
  Ch extends DefaultChannelType = DefaultChannelType,
  Co extends DefaultCommandType = DefaultCommandType,
  Ev extends DefaultEventType = DefaultEventType,
  Me extends DefaultMessageType = DefaultMessageType,
  Re extends DefaultReactionType = DefaultReactionType,
  Us extends DefaultUserType<Us> = DefaultUserType,
  V extends CustomTrigger = CustomTrigger
>(
  props: MessageInputProps<At, Ch, Co, Ev, Me, Re, Us, V>,
  state: MessageInputState<At, Us>,
  dispatch: React.Dispatch<MessageInputReducerAction<Us>>,
) => {
  const { doFileUploadRequest, errorHandler } = props;
  const { fileUploads } = state;
  const { channel } = useChannelStateContext<At, Ch, Co, Ev, Me, Re, Us>();

  const uploadFile = useCallback((id) => {
    dispatch({ id, state: 'uploading', type: 'setFileUpload' });
  }, []);

  const removeFile = useCallback((id) => {
    // TODO: cancel upload if still uploading
    dispatch({ id, type: 'removeFileUpload' });
  }, []);

  useEffect(() => {
    (async () => {
      if (!channel) return;
      const upload = Object.values(fileUploads).find(
        (fileUpload) => fileUpload.state === 'uploading' && fileUpload.file,
      );
      if (!upload) return;

      const { file, id } = upload;
      /** @type FileUploadAPIResponse */
      let response;
      try {
        if (doFileUploadRequest) {
          response = await doFileUploadRequest(file, channel);
        } else {
          response = await channel.sendFile(file as File);
        }
      } catch (error) {
        console.warn(error);
        let alreadyRemoved = false;

        if (!fileUploads[id]) {
          alreadyRemoved = true;
        } else {
          dispatch({ id, state: 'failed', type: 'setFileUpload' });
        }
        if (!alreadyRemoved && errorHandler) {
          // TODO: verify if the parameters passed to the error handler actually make sense
          errorHandler(error, 'upload-file', file);
        }
        return;
      }

      // If doImageUploadRequest returns any falsy value, then don't create the upload preview.
      // This is for the case if someone wants to handle failure on app level.
      if (!response) {
        removeFile(id);
        return;
      }

      dispatch({
        id,
        state: 'finished',
        type: 'setFileUpload',
        url: response.file,
      });
    })();
  }, [fileUploads, channel, doFileUploadRequest, errorHandler, removeFile]);

  return {
    removeFile,
    uploadFile,
  };
};
