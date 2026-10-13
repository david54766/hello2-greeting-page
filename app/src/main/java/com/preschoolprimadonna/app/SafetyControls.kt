package com.preschoolprimadonna.app

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Block
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
internal fun BlockMemberButton(name: String?, enabled: Boolean, onBlock: () -> Unit) {
    var confirm by rememberSaveable { mutableStateOf(false) }
    TextButton(onClick = { confirm = true }, enabled = enabled) {
        Icon(Icons.Outlined.Block, contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text("Block member")
    }
    if (confirm) AlertDialog(
        onDismissRequest = { confirm = false },
        containerColor = MaterialTheme.colorScheme.background,
        title = { Text("Block ${name?.takeIf { it.isNotBlank() } ?: "this member"}?") },
        text = { Text("Their conversations and replies will be hidden. You can unblock them in Settings.") },
        confirmButton = { TextButton(onClick = { confirm = false; onBlock() }, enabled = enabled) { Text("Block") } },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancel") } }
    )
}

@Composable
internal fun AccountDeletionControls(state: PrimaDonnaState, viewModel: PrimaDonnaViewModel) {
    var confirm by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(state.user?.id) { viewModel.loadDeletionStatus() }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        Text("Account deletion", style = MaterialTheme.typography.titleMedium)
        when {
            state.deletionStatusLoading -> LinearProgressIndicator(Modifier.fillMaxWidth())
            state.deletionError != null -> {
                Text(state.deletionError, color = MaterialTheme.colorScheme.error)
                TextButton(onClick = viewModel::loadDeletionStatus) { Text("Retry") }
            }
            state.deletionRequest != null -> {
                Text("Deletion request: ${state.deletionRequest.status.replace('_', ' ')}")
                Text("Contact info@classroompanda.com for assistance with your request.")
                TextButton(onClick = viewModel::loadDeletionStatus) { Text("Refresh status") }
            }
            state.deletionStatusLoaded -> {
                Text("Request permanent deletion of your account and associated data.")
                OutlinedButton(onClick = { confirm = true }, enabled = !state.saving) { Text("Request account deletion") }
            }
        }
    }
    if (confirm) AlertDialog(
        onDismissRequest = { confirm = false },
        containerColor = MaterialTheme.colorScheme.background,
        title = { Text("Request account deletion?") },
        text = { Text("This submits a request to permanently delete your account and associated data. Records required by law may be retained. Deletion is irreversible once completed.") },
        confirmButton = { TextButton(onClick = { confirm = false; viewModel.requestAccountDeletion() }, enabled = !state.saving) { Text("Request deletion") } },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancel") } }
    )
}

@Composable
internal fun BlockedMembersControls(state: PrimaDonnaState, viewModel: PrimaDonnaViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        Text("Blocked members", style = MaterialTheme.typography.titleMedium)
        if (state.data.eliteError != null) {
            Text(state.data.eliteError, color = MaterialTheme.colorScheme.error)
            TextButton(onClick = viewModel::refresh, enabled = !state.loading) { Text("Retry") }
        } else if (state.data.eliteBlocks.isEmpty()) {
            Text("No blocked members.")
        } else state.data.eliteBlocks.forEach { member ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(member.name ?: "Member", modifier = Modifier.weight(1f))
                TextButton(onClick = { viewModel.setEliteBlocked(member.userId, false) }, enabled = !state.saving) { Text("Unblock") }
            }
        }
    }
}
